// MySQL 备份逻辑的集成测试（需要本地 MySQL/MariaDB）。
// 运行：cargo test --test mysql_backup -- --nocapture
//
// 通过环境变量指定连接：
//   FLOATMEMO_TEST_MYSQL=127.0.0.1:3306
//   FLOATMEMO_TEST_MYSQL_USER=root
//   FLOATMEMO_TEST_MYSQL_PASSWORD=rootpw
//   FLOATMEMO_TEST_MYSQL_DB=floatmemo_test

use floatmemo_lib::mysql::{MysqlConfig, NoteRow};
use mysql::prelude::Queryable as _;
use mysql::Conn;

const TABLE: &str = "floatmemo_notes_test";

fn config() -> MysqlConfig {
    let host_port =
        std::env::var("FLOATMEMO_TEST_MYSQL").unwrap_or_else(|_| "127.0.0.1:3306".into());
    let (host, port) = host_port.rsplit_once(':').unwrap_or((host_port.as_str(), "3306"));
    MysqlConfig {
        host: host.to_string(),
        port: port.parse().unwrap_or(3306),
        user: std::env::var("FLOATMEMO_TEST_MYSQL_USER").unwrap_or_else(|_| "root".into()),
        password: std::env::var("FLOATMEMO_TEST_MYSQL_PASSWORD").unwrap_or_else(|_| "".into()),
        database: std::env::var("FLOATMEMO_TEST_MYSQL_DB")
            .unwrap_or_else(|_| "floatmemo_test".into()),
        table: Some(TABLE.into()),
    }
}

fn note(id: &str, title: &str, updated: i64) -> NoteRow {
    NoteRow {
        id: id.into(),
        title: title.into(),
        content: format!("内容 of {}", title),
        color: "yellow".into(),
        tags: vec!["测试".into(), "标签".into()],
        pinned: false,
        archived: false,
        created_at: updated - 1000,
        updated_at: updated,
    }
}

#[test]
fn backup_creates_table_and_syncs_rows() {
    let cfg = config();

    // 第一次备份时会自动建库，所以先建库再连
    floatmemo_lib::mysql::backup(&cfg, &[]).expect("首次备份应能自动建库");

    // 先清空目标表
    let mut conn = Conn::new(floatmemo_lib::mysql::build_opts(&cfg).unwrap()).unwrap();
    let _ = conn.query_drop(format!("DROP TABLE IF EXISTS `{}`", TABLE));

    // 空备份：建表但不写数据
    let result = floatmemo_lib::mysql::backup(&cfg, &[]).expect("空备份应成功");
    assert_eq!(result.written, 0);
    assert_eq!(result.table, TABLE);

    // ping 应能读到 0 条
    assert_eq!(floatmemo_lib::mysql::ping(&cfg).expect("ping 失败"), 0);

    // 写 3 条
    let notes = vec![
        note("a", "第一条", 1000),
        note("b", "第二条", 2000),
        note("c", "第三条", 3000),
    ];
    let result = floatmemo_lib::mysql::backup(&cfg, &notes).expect("备份失败");
    assert_eq!(result.written, 3);
    assert_eq!(result.total, 3);
    assert_eq!(floatmemo_lib::mysql::ping(&cfg).unwrap(), 3);

    // 改一条、加一条、删一条 → 远端应为 3 条（a 被更新，c 被删）
    let notes2 = vec![
        note("a", "第一条改过了", 1500),
        note("b", "第二条", 2000),
        note("d", "第四条", 4000),
    ];
    let result = floatmemo_lib::mysql::backup(&cfg, &notes2).expect("二次备份失败");
    assert_eq!(result.written, 3);
    assert_eq!(result.total, 3);

    // 校验内容确实更新了
    let mut conn = Conn::new(floatmemo_lib::mysql::build_opts(&cfg).unwrap()).unwrap();
    let title: Option<String> = conn
        .exec_first(format!("SELECT title FROM `{}` WHERE id = 'a'", TABLE), ())
        .unwrap();
    assert_eq!(title.as_deref(), Some("第一条改过了"));

    let ids: Vec<String> = conn.query(format!("SELECT id FROM `{}`", TABLE)).unwrap();
    assert_eq!(ids.len(), 3);
    assert!(!ids.contains(&"c".to_string()), "已删除的便签不该留在远端");
    assert!(ids.contains(&"d".to_string()));

    // 标签以 JSON 字符串存
    let tags: Option<String> = conn
        .exec_first(format!("SELECT tags FROM `{}` WHERE id = 'a'", TABLE), ())
        .unwrap();
    let tags = tags.unwrap();
    assert!(tags.contains("测试"), "标签应存成 JSON: {}", tags);

    // 中文内容不乱码
    let content: Option<String> = conn
        .exec_first(format!("SELECT content FROM `{}` WHERE id = 'a'", TABLE), ())
        .unwrap();
    assert!(content.unwrap().contains("内容 of"));

    // 表名净化（防注入）
    assert_eq!(
        floatmemo_lib::mysql::safe_ident("floatmemo_notes"),
        "floatmemo_notes"
    );
    assert_eq!(
        floatmemo_lib::mysql::safe_ident("evil`; DROP TABLE x; --"),
        "evilDROPTABLEx"
    );
    assert_eq!(floatmemo_lib::mysql::safe_ident(""), "floatmemo_notes");
}

/// 前端 invoke 的 JSON 结构必须能被 Rust 侧反序列化（IPC 契约测试）
#[test]
fn ipc_payload_contract() {
    // 与 src/lib/mysql.ts 里 mysqlBackup() 发送的结构一致
    let payload = r#"{
        "config": {
            "host": "127.0.0.1",
            "port": 3306,
            "user": "root",
            "password": "rootpw",
            "database": "floatmemo",
            "table": "floatmemo_notes"
        },
        "notes": [{
            "id": "n-1",
            "title": "标题",
            "content": "正文",
            "color": "yellow",
            "tags": ["a", "b"],
            "pinned": true,
            "archived": false,
            "createdAt": 1700000000000,
            "updatedAt": 1700000001000
        }]
    }"#;

    #[derive(serde::Deserialize)]
    struct Payload {
        config: MysqlConfig,
        notes: Vec<NoteRow>,
    }

    let parsed: Payload = serde_json::from_str(payload).expect("前端 payload 应能反序列化");
    assert_eq!(parsed.config.host, "127.0.0.1");
    assert_eq!(parsed.config.port, 3306);
    assert_eq!(parsed.config.database, "floatmemo");
    assert_eq!(parsed.notes.len(), 1);
    assert_eq!(parsed.notes[0].id, "n-1");
    assert_eq!(parsed.notes[0].tags, vec!["a", "b"]);
    assert!(parsed.notes[0].pinned);
    assert_eq!(parsed.notes[0].updated_at, 1700000001000);

    // table 省略时应回落到默认值
    let minimal = r#"{"config":{"host":"h","port":3306,"user":"u","password":"p","database":"d"},"notes":[]}"#;
    let parsed: Payload = serde_json::from_str(minimal).expect("缺省 table 应能解析");
    assert!(parsed.config.table.is_none());
}
