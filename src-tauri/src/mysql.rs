use mysql::prelude::Queryable;
use serde::{Deserialize, Serialize};

/// MySQL 连接配置（由前端设置页填写）
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MysqlConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
    /// 目标表名，默认 floatmemo_notes
    #[serde(default)]
    pub table: Option<String>,
}

/// 一条便签（备份用，与前端 Note 结构对应）
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRow {
    pub id: String,
    pub title: String,
    pub content: String,
    pub color: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub archived: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    /// 实际写入的表名
    pub table: String,
    /// 本次写进去的条数
    pub written: usize,
    /// 数据库中原有总条数
    pub total: usize,
}

/// 最近一次备份的状态，供前端显示
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatus {
    pub last_backup_at: Option<i64>,
    pub last_backup_count: Option<usize>,
    pub last_backup_host: Option<String>,
}

/// 表名净化：只保留字母数字与下划线，避免 SQL 注入
pub fn safe_ident(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect();
    if cleaned.is_empty() {
        "floatmemo_notes".to_string()
    } else {
        cleaned
    }
}

/// 构造连接参数
pub fn build_opts(config: &MysqlConfig) -> Result<mysql::Opts, String> {
    Ok(mysql::OptsBuilder::new()
        .ip_or_hostname(Some(config.host.trim()))
        .tcp_port(config.port)
        .user(Some(config.user.trim()))
        .pass(Some(config.password.as_str()))
        .db_name(Some(config.database.trim()))
        .prefer_socket(false)
        .tcp_connect_timeout(Some(std::time::Duration::from_secs(10)))
        .read_timeout(Some(std::time::Duration::from_secs(30)))
        .write_timeout(Some(std::time::Duration::from_secs(30)))
        .into())
}

/// 连接参数（不指定数据库，用于建库）
fn server_opts(config: &MysqlConfig) -> Result<mysql::Opts, String> {
    Ok(mysql::OptsBuilder::new()
        .ip_or_hostname(Some(config.host.trim()))
        .tcp_port(config.port)
        .user(Some(config.user.trim()))
        .pass(Some(config.password.as_str()))
        .prefer_socket(false)
        .tcp_connect_timeout(Some(std::time::Duration::from_secs(10)))
        .read_timeout(Some(std::time::Duration::from_secs(30)))
        .write_timeout(Some(std::time::Duration::from_secs(30)))
        .into())
}

/// 数据库名净化（只允许字母数字与下划线）
fn safe_db(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect();
    if cleaned.is_empty() {
        "floatmemo".to_string()
    } else {
        cleaned
    }
}

/// 确保目标库存在：连上服务器后 CREATE DATABASE IF NOT EXISTS
fn ensure_database(config: &MysqlConfig) -> Result<(), String> {
    let db = safe_db(&config.database);
    let mut conn = mysql::Conn::new(server_opts(config)?).map_err(|e| e.to_string())?;
    conn.query_drop(format!(
        "CREATE DATABASE IF NOT EXISTS `{}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        db
    ))
    .map_err(|e| format!("创建数据库 {} 失败：{}", db, e))?;
    Ok(())
}

/// 测试能否连上 MySQL：能连上就返回目标表里已有的便签条数（表不存在则 0）
pub fn ping(config: &MysqlConfig) -> Result<usize, String> {
    let table = safe_ident(config.table.as_deref().unwrap_or("floatmemo_notes"));

    // 库可能还不存在，先建出来
    ensure_database(config)?;

    let mut conn = mysql::Conn::new(build_opts(config)?).map_err(|e| e.to_string())?;

    // 表是否存在（用绑定参数，避免拼接）
    let exists: Option<i64> = conn
        .exec_first(
            "SELECT COUNT(*) FROM information_schema.tables \
             WHERE table_schema = ? AND table_name = ?",
            (safe_db(&config.database), &table),
        )
        .map_err(|e| e.to_string())?;
    if exists.unwrap_or(0) == 0 {
        return Ok(0);
    }

    let count: Option<i64> = conn
        .query_first(format!("SELECT COUNT(*) FROM `{}`", table))
        .map_err(|e| e.to_string())?;
    Ok(count.unwrap_or(0) as usize)
}

/// 把全部便签备份进 MySQL：建表（不存在时）+ upsert + 清理已删除的旧行
pub fn backup(config: &MysqlConfig, notes: &[NoteRow]) -> Result<BackupResult, String> {
    let table = safe_ident(config.table.as_deref().unwrap_or("floatmemo_notes"));

    // 库不存在就建一个
    ensure_database(config)?;

    let mut conn = mysql::Conn::new(build_opts(config)?).map_err(|e| e.to_string())?;

    conn.query_drop(format!(
        "CREATE TABLE IF NOT EXISTS `{}` (
            id           VARCHAR(128) NOT NULL PRIMARY KEY,
            title        VARCHAR(255) NOT NULL DEFAULT '',
            content      MEDIUMTEXT NOT NULL,
            color        VARCHAR(32)  NOT NULL DEFAULT 'yellow',
            tags         TEXT         NOT NULL,
            pinned       TINYINT(1)   NOT NULL DEFAULT 0,
            archived     TINYINT(1)   NOT NULL DEFAULT 0,
            created_at   BIGINT       NOT NULL DEFAULT 0,
            updated_at   BIGINT       NOT NULL DEFAULT 0,
            INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        table
    ))
    .map_err(|e| format!("建表失败：{}", e))?;

    for n in notes {
        conn.exec_drop(
            format!(
                "INSERT INTO `{}`
                 (id, title, content, color, tags, pinned, archived, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    content = VALUES(content),
                    color = VALUES(color),
                    tags = VALUES(tags),
                    pinned = VALUES(pinned),
                    archived = VALUES(archived),
                    created_at = VALUES(created_at),
                    updated_at = VALUES(updated_at)",
                table
            ),
            (
                &n.id,
                &n.title,
                &n.content,
                &n.color,
                serde_json::to_string(&n.tags).unwrap_or_else(|_| "[]".to_string()),
                n.pinned as i8,
                n.archived as i8,
                n.created_at,
                n.updated_at,
            ),
        )
        .map_err(|e| format!("写入失败：{}", e))?;
    }

    // 清理本地已删除的便签：只保留 id 在本次备份集合里的行
    if notes.is_empty() {
        conn.query_drop(format!("DELETE FROM `{}`", table))
            .map_err(|e| format!("清理失败：{}", e))?;
    } else {
        let ids: Vec<&str> = notes.iter().map(|n| n.id.as_str()).collect();
        let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        conn.exec_drop(
            format!("DELETE FROM `{}` WHERE id NOT IN ({})", table, placeholders),
            &ids,
        )
        .map_err(|e| format!("清理失败：{}", e))?;
    }

    let total: Option<i64> = conn
        .query_first(format!("SELECT COUNT(*) FROM `{}`", table))
        .map_err(|e| e.to_string())?;

    Ok(BackupResult {
        table,
        written: notes.len(),
        total: total.unwrap_or(0) as usize,
    })
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
