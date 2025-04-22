import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import EntryAccordion from "./EntryAccordion";

const EntryList = ({ role, loggedInUser }) => {
  const [entries, setEntries] = useState([]);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newValidUntil, setNewValidUntil] = useState("");
  const { showSnackbar } = useSnackbar();

  const fetchEntries = useCallback(async () => {
    try {
      let query = supabase.from("entries").select("*");
      if (role !== "Admin") {
        query = query.eq("owner", loggedInUser);
      }
      const { data, error } = await query.order("createdAt", { ascending: false });
      if (error) throw error;
      setEntries(data);
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [role, loggedInUser, showSnackbar]);

  const fetchExtensionRequests = useCallback(async () => {
    if (role !== "Admin") return;
    try {
      const { data, error } = await supabase
        .from("extension_requests")
        .select("*, entries(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setExtensionRequests(data);
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [role, showSnackbar]);

  useEffect(() => {
    fetchEntries();
    fetchExtensionRequests();
  }, [fetchEntries, fetchExtensionRequests]);

  const handleApproveExtension = async () => {
    if (!selectedRequest || !newValidUntil) return;
    try {
      // Update the entry's validUntil date
      const { error: updateError } = await supabase
        .from("entries")
        .update({ validUntil: new Date(newValidUntil) })
        .eq("id", selectedRequest.entry_id);
      if (updateError) throw updateError;

      // Update the request status
      const { error: requestError } = await supabase
        .from("extension_requests")
        .update({ status: "approved" })
        .eq("id", selectedRequest.id);
      if (requestError) throw requestError;

      // Refresh entries and requests
      await fetchEntries();
      await fetchExtensionRequests();
      setIsDialogOpen(false);
      setNewValidUntil("");
      showSnackbar("Verlängerungsanfrage erfolgreich genehmigt!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  };

  const handleRejectExtension = async () => {
    if (!selectedRequest) return;
    try {
      const { error } = await supabase
        .from("extension_requests")
        .update({ status: "rejected" })
        .eq("id", selectedRequest.id);
      if (error) throw error;

      await fetchExtensionRequests();
      setIsDialogOpen(false);
      showSnackbar("Verlängerungsanfrage abgelehnt!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Einträge
      </Typography>

      {/* Extension Requests for Admins */}
      {role === "Admin" && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Verlängerungsanfragen
          </Typography>
          {extensionRequests.length === 0 ? (
            <Typography>Keine offenen Anfragen.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Eintrag</TableCell>
                    <TableCell>Ersteller</TableCell>
                    <TableCell>Angefragt am</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {extensionRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.entries?.aliasNotes}</TableCell>
                      <TableCell>{request.requested_by}</TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => {
                            setSelectedRequest(request);
                            setNewValidUntil("");
                            setIsDialogOpen(true);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Bearbeiten
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Entry List */}
      {entries.map((entry) => (
        <EntryAccordion
          key={entry.id}
          entry={entry}
          role={role}
          loggedInUser={loggedInUser}
          setEntries={setEntries}
        />
      ))}

      {/* Dialog for Approving Extension Requests */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Verlängerungsanfrage bearbeiten</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Eintrag: {selectedRequest?.entries?.aliasNotes}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Aktuelles Gültigkeitsdatum: {formatDate(selectedRequest?.entries?.validUntil)}
          </Typography>
          <TextField
            label="Neues Gültigkeitsdatum"
            type="date"
            value={newValidUntil}
            onChange={(e) => setNewValidUntil(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleRejectExtension}
            color="error"
            sx={{ fontSize: "0.875rem" }}
          >
            Ablehnen
          </Button>
          <Button
            onClick={handleApproveExtension}
            color="primary"
            disabled={!newValidUntil}
            sx={{ fontSize: "0.875rem" }}
          >
            Genehmigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
