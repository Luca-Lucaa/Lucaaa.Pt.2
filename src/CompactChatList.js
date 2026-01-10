import React, { useState, useRef, useEffect } from "react";
import {
  List,
  ListItem,
  Divider,
  Typography,
  Box,
  TextField,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { supabase } from "./supabaseClient";
import { handleError } from "./utils";
import ChatMessage from "./ChatMessage";

const CompactChatList = ({ messages: initialMessages, loggedInUser }) => {
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-Scroll zum unteren Ende bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert([
        {
          sender: loggedInUser,
          receiver: "Admin",
          message: newMessage,
          parent_message_id: replyTo ? replyTo.id : null,
        },
      ]);
      if (error) throw error;
      setNewMessage("");
      setReplyTo(null);
    } catch (error) {
      handleError(error);
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const { data: message } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single();

      const currentReactions = message.reactions || {};
      const updatedReactions = {
        ...currentReactions,
        [emoji]: (currentReactions[emoji] || 0) + 1,
      };

      await supabase
        .from("messages")
        .update({ reactions: updatedReactions })
        .eq("id", messageId);
      
      handleMenuClose();
    } catch (error) {
      handleError(error);
    }
  };

  const handleMenuOpen = (event, messageId) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };

  const handleReply = (message) => {
    setReplyTo(message);
    handleMenuClose();
  };

  return (
    <Box sx={{ 
      marginBottom: 2, 
      maxHeight: '500px', 
      overflowY: 'auto',
      px: 1,
      pb: 2
    }}>
      <Typography variant="h6" gutterBottom>
        Chat
      </Typography>

      <List disablePadding>
        {initialMessages.map((msg) => (
          <React.Fragment key={msg.id}>
            <ListItem disablePadding sx={{ mb: 2 }}>
              <ChatMessage
                message={msg.message}
                sender={msg.sender}
                timestamp={msg.created_at}
                isOwnMessage={msg.sender === loggedInUser}
                reactions={msg.reactions || {}}
                onReact={(emoji) => addReaction(msg.id, emoji)}
                onMenuOpen={(e) => handleMenuOpen(e, msg.id)}
                parentMessage={
                  msg.parent_message_id 
                    ? initialMessages.find(m => m.id === msg.parent_message_id) 
                    : null
                }
                isRead={msg.read}
              />
            </ListItem>
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </List>

      <Box sx={{ 
        position: 'sticky', 
        bottom: 0, 
        backgroundColor: 'background.paper',
        pt: 2,
        pb: 1,
        zIndex: 10
      }}>
        {replyTo && (
          <Box
            sx={{
              backgroundColor: "grey.200",
              padding: 1.5,
              borderRadius: 2,
              mb: 1.5,
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              maxWidth: '85%',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Antwort auf: <strong>{replyTo.sender}</strong> — {replyTo.message}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            label="Nachricht schreiben..."
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
            multiline
            minRows={1}
            maxRows={5}
            size="small"
          />
          <IconButton 
            onClick={sendMessage} 
            color="primary" 
            disabled={!newMessage.trim()}
            size="medium"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleReply(initialMessages.find(m => m.id === selectedMessageId))}>
          Antworten
        </MenuItem>
        <MenuItem onClick={() => addReaction(selectedMessageId, "👍")}>
          👍 Like
        </MenuItem>
        <MenuItem onClick={() => addReaction(selectedMessageId, "❤️")}>
          ❤️ Herz
        </MenuItem>
        <MenuItem onClick={() => addReaction(selectedMessageId, "😂")}>
          😂 Lachen
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CompactChatList;
