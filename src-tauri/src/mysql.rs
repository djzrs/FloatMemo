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
    /// 加密方式：none=明文 / required=强制 TLS 并校验证书 / insecure=强制 TLS 但不校验证书
    #[serde(default)]
    pub ssl_mode: Option<String>,
    /// 自定义 CA 证书路径（.pem / .der），可选
    #[serde(default)]
    pub ca_path: Option<String>,
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

/// 加密方式
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SslMode {
    /// 明文连接（本地 MySQL 默认）
    None,
    /// 强制 TLS 并校验服务端证书（TiDB Cloud / 云数据库推荐）
    Required,
    /// 强制 TLS 但不校验证书（自签名证书时用）
    Insecure,
}

impl SslMode {
    pub fn parse(raw: Option<&str>) -> SslMode {
        match raw.unwrap_or("none").trim().to_ascii_lowercase().as_str() {
            "required" | "tls" | "ssl" | "true" => SslMode::Required,
            "insecure" | "skip-verify" | "skip_verify" | "none-verify" => SslMode::Insecure,
            _ => SslMode::None,
        }
    }
}

/// 按加密方式构造 SslOpts
fn ssl_opts(config: &MysqlConfig) -> Option<mysql::SslOpts> {
    let ca = config
        .ca_path
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(std::path::PathBuf::from);

    match SslMode::parse(config.ssl_mode.as_deref()) {
        SslMode::None => None,
        SslMode::Required => {
            // 加密 + 校验证书（内建 webpki-roots 始终保留，用户 CA 追加）
            let mut opts = mysql::SslOpts::default();
            if let Some(ca) = ca {
                opts = opts.with_root_cert_path(Some(ca));
            }
            Some(opts)
        }
        SslMode::Insecure => {
            // 加密但不校验证书链与域名（自签名证书时用）
            let mut opts = mysql::SslOpts::default()
                .with_danger_accept_invalid_certs(true)
                .with_danger_skip_domain_validation(true);
            if let Some(ca) = ca {
                opts = opts.with_root_cert_path(Some(ca));
            }
            Some(opts)
        }
    }
}

/// 构造连接参数
pub fn build_opts(config: &MysqlConfig) -> Result<mysql::Opts, String> {
    let mut builder = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(config.host.trim()))
        .tcp_port(config.port)
        .user(Some(config.user.trim()))
        .pass(Some(config.password.as_str()))
        .db_name(Some(config.database.trim()))
        .prefer_socket(false)
        .tcp_connect_timeout(Some(std::time::Duration::from_secs(10)))
        .read_timeout(Some(std::time::Duration::from_secs(30)))
        .write_timeout(Some(std::time::Duration::from_secs(30)));
    if let Some(opts) = ssl_opts(config) {
        builder = builder.ssl_opts(opts);
    }
    Ok(builder.into())
}

/// 连接参数（不指定数据库，用于建库）
fn server_opts(config: &MysqlConfig) -> Result<mysql::Opts, String> {
    let mut builder = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(config.host.trim()))
        .tcp_port(config.port)
        .user(Some(config.user.trim()))
        .pass(Some(config.password.as_str()))
        .prefer_socket(false)
        .tcp_connect_timeout(Some(std::time::Duration::from_secs(10)))
        .read_timeout(Some(std::time::Duration::from_secs(30)))
        .write_timeout(Some(std::time::Duration::from_secs(30)));
    if let Some(opts) = ssl_opts(config) {
        builder = builder.ssl_opts(opts);
    }
    Ok(builder.into())
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
///
/// 云数据库（如 TiDB Cloud Serverless）通常不允许建库，也不一定需要建库，
/// 所以这里失败不致命——只要后续能连上目标库就行。
fn ensure_database(config: &MysqlConfig) -> Result<(), String> {
    let db = safe_db(&config.database);
    let mut conn = mysql::Conn::new(server_opts(config)?).map_err(conn_err)?;
    if let Err(e) = conn.query_drop(format!(
        "CREATE DATABASE IF NOT EXISTS `{}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        db
    )) {
        // 建不了库不一定是错（权限受限 / 库已由平台建好），继续往下走
        eprintln!("[mysql] 创建数据库 {} 未成功：{}", db, e);
    }
    Ok(())
}

/// 把 MySQL 错误翻译成看得懂的中文提示
pub fn explain_error(err: &str) -> String {
    let lower = err.to_ascii_lowercase();
    if lower.contains("insecure transport") {
        return "服务端强制要求加密连接（TiDB Cloud / 部分云数据库的策略）。\
                请把「加密方式」改成「TLS（校验证书）」，自签名证书则选「TLS（不校验）」。"
            .to_string();
    }
    if lower.contains("access denied") {
        return "认证失败：用户名或密码不对。云数据库的用户名通常要带集群前缀（如 xxx.root）。".to_string();
    }
    if lower.contains("unknown database") {
        return "数据库不存在。请确认「数据库」名称，或换一个已有权限的库。".to_string();
    }
    if lower.contains("connection refused") || lower.contains("timed out") || lower.contains("os error 10061") {
        return "连不上服务器：请检查主机地址、端口，以及防火墙/安全组是否放行。".to_string();
    }
    if lower.contains("certificate") || lower.contains("rustls") || lower.contains("handshake") {
        return "TLS 握手失败：证书无法校验。可改用「TLS（不校验）」，或指定正确的 CA 证书文件。".to_string();
    }
    err.to_string()
}

/// 连接失败时套上友好提示
fn conn_err(e: impl std::fmt::Display) -> String {
    explain_error(&e.to_string())
}

/// 测试能否连上 MySQL：能连上就返回目标表里已有的便签条数（表不存在则 0）
pub fn ping(config: &MysqlConfig) -> Result<usize, String> {
    let table = safe_ident(config.table.as_deref().unwrap_or("floatmemo_notes"));

    // 库可能还不存在，先建出来
    ensure_database(config)?;

    let mut conn = mysql::Conn::new(build_opts(config)?).map_err(conn_err)?;

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

    let mut conn = mysql::Conn::new(build_opts(config)?).map_err(conn_err)?;

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
