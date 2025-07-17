import React, { useState } from "react";
import { Fab, Dialog, DialogTitle, DialogContent, DialogActions, Badge, useMediaQuery, useTheme } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { useMessages } from "./utils";
import { useSnackbar } from "./useSnackbar";

// Platzhalter für die Chat-Komponente (ersetze durch deine tatsächliche Chat-Komponente)
const ChatContent = ({ loggedInUser, selectedUser, onClose }) => {
  const { messages, unreadCount, fetchMessages, markAsRead } = useMessages(loggedInUser, selectedUser);

  return (
    <Box sx={{ p: 2, minWidth: { xs: "100%", sm: 400 }, minHeight: 300 }}>
      <Typography variant="h6">Chat mit {selectedUser}</Typography>
      {messages.length === 0 ? (
        <Typography>Keine Nachrichten vorhanden.</Typography>
      ) : (
        <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                mb: 1,
                p: 1,
                bgcolor: msg.sender === loggedInUser ? "primary.light" : "grey.200",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                <strong>{msg.sender}:</strong> {msg.content}
              </Typography>
              <Typography variant="caption">{formatDate(msg.created_at)}</Typography>
            </Box>
          ))}
        </Box>
      )}
      <Button onClick={markAsRead} disabled={!unreadCount[selectedUser]}>
        Als gelesen markieren
      </Button>
      <Button onClick={onClose}>Schließen</Button>
    </Box>
  );
};

const FloatingChatButton = ({ loggedInUser }) => {
  const [openChat, setOpenChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { unreadCount } = useMessages(loggedInUser, selectedUser);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const totalUnread = Object.values(unreadCount || {}).reduce((sum, count) => sum + count, 0);

  const handleOpenChat = () => {
    if (!loggedInUser) {
      showSnackbar("Bitte melden Sie sich an, um den Chat zu verwenden.", "error");
      return;
    }
    setOpenChat(true);
  };

  const handleCloseChat = () => {
    setOpenChat(false);
    setSelectedUser(null);
  };

  // Beispiel: Liste der verfügbaren Benutzer (kann aus Datenbank oder Props geladen werden)
  const availableUsers = ["Scholli", "Jamaica05", "Admin"]; // Ersetze durch tatsächliche Benutzerliste

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
          zIndex: 1000,
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
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Chat</DialogTitle>
        <DialogContent>
          {!selectedUser ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Benutzer auswählen</Typography>
              {availableUsers.length === 0 ? (
                <Typography>Keine Benutzer verfügbar.</Typography>
              ) : (
                availableUsers.map((user) => (
                  <Button
                    key={user}
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 1 }}
                    onClick={() => setSelectedUser(user)}
                  >
                    {user} {unreadCount[user] ? `(${unreadCount[user]} ungelesen)` : ""}
                  </Button>
                ))
              )}
            </Box>
          ) : (
            <ChatContent loggedInUser={loggedInUser} selectedUser={selectedUser} onClose={handleCloseChat} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseChat}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FloatingChatButton;
