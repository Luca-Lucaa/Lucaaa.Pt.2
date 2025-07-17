import React, { useState, useCallback, useMemo } from "react";
import { Fab, Dialog, DialogTitle, DialogContent, DialogActions, Badge, Box, Button, TextField, useMediaQuery, useTheme } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { useMessages, handleError } from "./utils";
import { USER_EMOJIS } from "./config";
import ChatMessage from "./ChatMessage";
import { useSnackbar } from "./useSnackbar";

const FloatingChatButton = ({ loggedInUser, role }) => {
  const [openChat, setOpenChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState(role === "Admin" ? "Scholli" : "Admin");
  const [newMessage, setNewMessage] = useState("");
  const { messages, unreadCount, markAsRead } = useMessages(loggedInUser, selectedUser);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const totalUnread = useMemo(() => Object.values(unreadCount || {}).reduce((sum, count) => sum + count, 0), [unreadCount]);

  const availableUsers = useMemo(() => {
    const users = ["Scholli", "Jamaica05", "Admin"].filter((user) => user !== loggedInUser);
    return users;
  }, [loggedInUser]);

  const handleOpenChat = useCallback(() => {
    if (!loggedInUser) {
      showSnackbar("Bitte melden Sie sich an, um den Chat zu verwenden.", "error");
      return;
    }
    setOpenChat(true);
  }, [loggedInUser, showSnackbar]);

  const handleCloseChat = useCallback(() => {
    setOpenChat(false);
    setSelectedUser(role === "Admin" ? "Scholli" : "Admin");
    setNewMessage("");
  }, [role]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) {
      showSnackbar("❌ Nachricht darf nicht leer sein", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from("messages")
        .insert([{ sender: loggedInUser, receiver: selectedUser, message: newMessage, read: false }]);
      if (error) throw error;
      setNewMessage("");
      showSnackbar("✅ Nachricht gesendet!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [newMessage, loggedInUser, selectedUser, showSnackbar]);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <>
      <Fab
        color="primary"
        aria-label="Chat öffnen"
        onClick={handleOpenChat}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1300,
          animation: totalUnread > 0 ? "pulse 2s infinite" : "none",
          "@keyframes pulse": {
            "0%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.2)" },
            "100%": { transform: "scale(1)" },
          },
        }}
      >
        <Badge badgeContent={totalUnread} color="error">
          <ChatIcon />
        </Badge>
      </Fab>
      <Dialog
        open={openChat}
        onClose={handleCloseChat}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle>Chat</DialogTitle>
        <DialogContent>
          {!selectedUser ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Benutzer auswählen</Typography>
              {availableUsers.length === 0 ? (
                <Typography>Keine Benutzer verfügbar.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {availableUsers.map((user) => (
                    <Button
                      key={user}
                      variant="outlined"
                      onClick={() => setSelectedUser(user)}
                      sx={{ justifyContent: "flex-start" }}
                    >
                      {user} {USER_EMOJIS[user]} {unreadCount[user] ? `(${unreadCount[user]} ungelesen)` : ""}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 2, minWidth: { xs: "100%", sm: 400 }, minHeight: 300 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Chat mit {selectedUser} {USER_EMOJIS[selectedUser]}
              </Typography>
              <Box sx={{ maxHeight: 300, overflowY: "auto", mb: 2 }}>
                {reversedMessages.length === 0 ? (
                  <Typography>Keine Nachrichten vorhanden.</Typography>
                ) : (
                  reversedMessages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg.message}
                      sender={msg.sender}
                      timestamp={msg.created_at}
                      isOwnMessage={msg.sender === loggedInUser}
                    />
                  ))
                )}
              </Box>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
                <TextField
                  label="Neue Nachricht"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{ backgroundColor: "white", borderRadius: 2 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={sendMessage}
                  sx={{ width: { xs: "100%", sm: "auto" }, borderRadius: 2, alignSelf: "flex-end" }}
                  disabled={!newMessage.trim()}
                >
                  Senden
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedUser && (
            <Button onClick={markAsRead} disabled={!unreadCount[selectedUser]}>
              Als gelesen markieren
            </Button>
          )}
          <Button onClick={handleCloseChat}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FloatingChatButton;
