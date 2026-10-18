//! Messages exchanged over `/ws`. Every type here is exported to TypeScript by ts-rs
//! (`just protocol`), so the web app and the server can't drift apart.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum ServerMessage {
    #[serde(rename_all = "camelCase")]
    Welcome { server_version: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum ClientMessage {
    Ping,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn welcome_is_tagged_camel_case_json() {
        let message = ServerMessage::Welcome {
            server_version: "0.1.0".into(),
        };
        let json = serde_json::to_value(&message).unwrap();
        assert_eq!(json, serde_json::json!({ "type": "welcome", "serverVersion": "0.1.0" }));
    }

    #[test]
    fn ping_parses_from_json() {
        let message: ClientMessage = serde_json::from_str(r#"{ "type": "ping" }"#).unwrap();
        assert!(matches!(message, ClientMessage::Ping));
    }
}
