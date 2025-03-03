import React, { useState } from "react";
import {
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Typography,
  Box,
  TextField,
  IconButton,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { supabase } from "./supabaseClient";
import { handleError } from "./utils";

const CompactChatList = ({ messages: initialMessages, loggedInUser }) => {
  const [showAll, setShowAll] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const { error } = await supabase
        .from("messages")
        .insert([{ sender: loggedInUser, receiver: "Admin", message: newMessage }]);
      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      handleError(error);
    }
  };

  const displayedMessages = showAll ? initialMessages : initialMessages.slice(-5);

  return (
    <Box sx={{ marginBottom: 2 }}>
      <Typography variant="h6" gutterBottom>
        Chat {/* Geändert von "Chatverlauf" zu "Chat" */}
      </Typography>
      <List>
        {displayedMessages.map((msg) => (
          <React.Fragment key={msg.id}>
            <ListItem>
              <ListItemText
                primary={msg.message}
                secondary={`Von: ${msg.sender} am ${new Date(msg.created_at).toLocaleString()}`}
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
      {initialMessages.length > 5 && (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="outlined"
          fullWidth
          sx={{ marginTop: 2 }}
        >
          {showAll ? "Weniger anzeigen" : "Alle Nachrichten anzeigen"}
        </Button>
      )}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", marginTop: 2 }}>
        <TextField
          label="Neue Nachricht"
          variant="outlined"
          fullWidth
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <IconButton onClick={sendMessage} color="primary" disabled={!newMessage.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default CompactChatList;
