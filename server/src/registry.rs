//! All open rooms by code. The only shared state in the server; each room's game lives in its own task.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use rand::RngExt;
use tokio::sync::mpsc;

use crate::{
    limits,
    protocol::RejectReason,
    room::task::{self, RoomCommand},
    words::WordLibrary,
};

/// Consonants only (no words by accident) and nothing that reads like another character (no I, O, U, Y).
const CODE_ALPHABET: &[u8] = b"BCDFGHJKLMNPQRSTVWXZ";
const CODE_LENGTH: usize = 4;

#[derive(Clone)]
pub struct RoomHandle {
    pub commands: mpsc::Sender<RoomCommand>,
}

pub struct Registry {
    rooms: Mutex<HashMap<String, RoomHandle>>,
    words: Arc<WordLibrary>,
}

impl Registry {
    pub fn new(words: Arc<WordLibrary>) -> Arc<Self> {
        Arc::new(Self {
            rooms: Mutex::new(HashMap::new()),
            words,
        })
    }

    pub fn create(self: &Arc<Self>) -> Result<(String, RoomHandle), RejectReason> {
        let mut rooms = self
            .rooms
            .lock()
            .expect("registry lock is never poisoned: no code panics while holding it");
        if rooms.len() >= limits::MAX_ROOMS {
            return Err(RejectReason::TooManyRooms);
        }
        let mut rng = rand::rng();
        let code = loop {
            let code: String = (0..CODE_LENGTH)
                .map(|_| char::from(CODE_ALPHABET[rng.random_range(0..CODE_ALPHABET.len())]))
                .collect();
            if !rooms.contains_key(&code) {
                break code;
            }
        };
        let seed = rng.random::<u64>();
        let handle = task::spawn(code.clone(), self.words.clone(), seed, Arc::downgrade(self));
        rooms.insert(code.clone(), handle.clone());
        Ok((code, handle))
    }

    pub fn find(&self, code: &str) -> Option<RoomHandle> {
        let code = code.trim().to_ascii_uppercase();
        self.rooms
            .lock()
            .expect("registry lock is never poisoned")
            .get(&code)
            .cloned()
    }

    pub fn remove(&self, code: &str) {
        self.rooms.lock().expect("registry lock is never poisoned").remove(code);
    }

    pub fn room_count(&self) -> usize {
        self.rooms.lock().expect("registry lock is never poisoned").len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn codes_are_four_easy_letters_and_rooms_can_be_found_again() {
        let registry = Registry::new(Arc::new(WordLibrary::default()));
        let (code, _) = registry.create().unwrap();
        assert_eq!(code.len(), 4);
        assert!(code.bytes().all(|byte| CODE_ALPHABET.contains(&byte)));
        assert!(registry.find(&format!(" {} ", code.to_lowercase())).is_some());
        assert!(registry.find("AAAA").is_none());

        registry.remove(&code);
        assert_eq!(registry.room_count(), 0);
    }
}
