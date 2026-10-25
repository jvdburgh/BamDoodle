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

/// Consonants only (no words by accident) and none that reads like another, on a screen or aloud: no C (G), N (M),
/// L (I), Q (O). 16⁴ = 65,536 codes for at most `MAX_ROOMS`, so a new code rarely needs a second draw.
/// Same as `RoomCodeUtils` in `web/src/protocol/roomCode.utils.ts`.
const CODE_ALPHABET: &[u8] = b"BDFGHJKMPRSTVWXZ";
const CODE_LENGTH: usize = 4;
/// A typed look-alike and the code letter it stands for; same as `LOOKALIKES` in `RoomCodeUtils`.
const LOOKALIKES: [(char, char); 2] = [('C', 'G'), ('N', 'M')];

/// A code as someone typed or linked it, in any case: `" bcnk "` is `BGMK`.
fn normalise(code: &str) -> String {
    code.trim()
        .chars()
        .map(|letter| {
            let letter = letter.to_ascii_uppercase();
            LOOKALIKES
                .iter()
                .find(|(lookalike, _)| *lookalike == letter)
                .map_or(letter, |&(_, kept)| kept)
        })
        .collect()
}

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
        crate::usage::room_created(rooms.len());
        Ok((code, handle))
    }

    pub fn words(&self) -> &WordLibrary {
        &self.words
    }

    pub fn find(&self, code: &str) -> Option<RoomHandle> {
        let code = normalise(code);
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

    #[test]
    fn codes_have_no_letters_that_read_like_another() {
        assert!(b"CLNQIOUY".iter().all(|letter| !CODE_ALPHABET.contains(letter)));
    }

    #[test]
    fn a_look_alike_reads_as_the_letter_it_looks_like() {
        assert_eq!(normalise(" bcnk "), "BGMK");
        assert_eq!(normalise("BLZW"), "BLZW");
    }

    #[test]
    fn a_room_is_found_by_a_look_alike_of_its_code() {
        let registry = Registry::new(Arc::new(WordLibrary::default()));
        let (commands, _) = mpsc::channel(1);
        registry
            .rooms
            .lock()
            .unwrap()
            .insert("BGMK".into(), RoomHandle { commands });
        assert!(registry.find("bcnk").is_some());
        assert!(registry.find("BLMK").is_none());
    }
}
