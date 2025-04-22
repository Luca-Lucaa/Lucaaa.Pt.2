import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import EntryAccordion from "./EntryAccordion";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";

const EntryList = ({ entries, role, loggedInUser, setEntries }) => {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openManualDialog, setOpenManualDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    username: "",
    aliasNotes: "",
    bougetList: "",
    admin_fee: "",
    password: "",
    validUntil: "",
  });
  const [manualEntry, setManualEntry] = useState({
    username: "",
    aliasNotes: "",
    bougetList: "",
    admin_fee: "",
    password: "",
    validUntil: "",
    owner: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Einträge nach Suche, Tab und Gültigkeitsdatum filtern
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Suche nach Benutzername oder Spitzname
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.username?.toLowerCase().includes(query) ||
          entry.aliasNotes?.toLowerCase().includes(query)
      );
    }

    // Filter nach Tab (all, active, inactive, paid, notpaid)
    if (filterTab === "active") {
      result = result.filter((entry) => entry.status === "Aktiv");
    } else if (filterTab === "inactive") {
      result = result.filter((entry) => entry.status === "Inaktiv");
    } else if (filterTab === "paid") {
      result = result.filter((entry) => entry.paymentStatus === "Gezahlt");
    } else if (filterTab === "notpaid") {
      result = result.filter((entry) => entry.paymentStatus === "Nicht gezahlt");
    }

    // Filter nach Gültigkeitsdatum
    if (filterStartDate || filterEndDate) {
      result = result.filter((entry) => {
        if (!entry.validUntil) return false; // Einträge ohne validUntil ausblenden, wenn Filter aktiv
        const validUntilDate = new Date(entry.validUntil);
        const startDate = filterStartDate ? new Date(filterStartDate) : null;
        const endDate = filterEndDate ? new Date(filterEndDate) : null;

        if (startDate && validUntilDate < startDate) return false;
        if (endDate && validUntilDate > endDate) return false;
        return true;
      });
    }

    return result;
  }, [entries, searchQuery, filterTab, filterStartDate, filterEndDate]);

  // Neue Einträge erstellen
  const handleCreateEntry = useCallback(async () => {
    if (!newEntry.username || !newEntry.aliasNotes || !newEntry.validUntil) {
      showSnackbar("Bitte alle Pflichtfelder ausfüllen.", "error");
      return;
    }
    const validUntilDate = new Date(newEntry.validUntil);
    if (validUntilDate < new Date()) {
      showSnackbar("Gültigkeitsdatum muss in der Zukunft liegen.", "error");
      return;
    }
    if (newEntry.admin_fee && isNaN(parseInt(newEntry.admin_fee))) {
      showSnackbar("Admin-Gebühr muss eine Zahl sein.", "error");
      return;
    }

    const entryData = {
      username: newEntry.username,
      aliasNotes: newEntry.aliasNotes,
      bougetList: newEntry.bougetList || null,
      admin_fee: newEntry.admin_fee ? parseInt(newEntry.admin_fee) : null,
      password: newEntry.password || null,
      validUntil: validUntilDate.toISOString(),
      owner: loggedInUser,
      createdAt: new Date().toISOString(),
      status: "Inaktiv", // Automatisch auf Inaktiv setzen
      paymentStatus: "Nicht gezahlt", // Automatisch auf Nicht gezahlt setzen
      extensionRequest: null,
    };

    try {
      const { data, error } = await supabase
        .from("entries")
        .insert([entryData])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      setOpenCreateDialog(false);
      setNewEntry({
        username: "",
        aliasNotes: "",
        bougetList: "",
        admin_fee: "",
        password: "",
        validUntil: "",
      });
      showSnackbar("Eintrag erfolgreich erstellt!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [newEntry, loggedInUser, setEntries, showSnackbar]);

  // Manuelles Hinzufügen bestehender Einträge
  const handleManualEntry = useCallback(async () => {
    if (
      !manualEntry.username ||
      !manualEntry.aliasNotes ||
      !manualEntry.validUntil ||
      !manualEntry.owner
    ) {
      showSnackbar("Bitte alle Pflichtfelder ausfüllen.", "error");
      return;
    }
    const validUntilDate = new Date(manualEntry.validUntil);
    if (validUntilDate < new Date()) {
      showSnackbar("Gültigkeitsdatum muss in der Zukunft liegen.", "error");
      return;
    }
    if (manualEntry.admin_fee && isNaN(parseInt(manualEntry.admin_fee))) {
      showSnackbar("Admin-Gebühr muss eine Zahl sein.", "error");
      return;
    }

    const entryData = {
      username: manualEntry.username,
      aliasNotes: manualEntry.aliasNotes,
      bougetList: manualEntry.bougetList || null,
      admin_fee: manualEntry.admin_fee ? parseInt(manualEntry.admin_fee) : null,
      password: manualEntry.password || null,
      validUntil: validUntilDate.toISOString(),
      owner: manualEntry.owner,
      createdAt: new Date().toISOString(),
      status: "Inaktiv", // Automatisch auf Inaktiv setzen
      paymentStatus: "Nicht gezahlt", // Automatisch auf Nicht gezahlt setzen
      extensionRequest: null,
    };

    try {
      const { data, error } = await supabase
        .from("entries")
        .insert([entryData])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      setOpenManualDialog(false);
      setManualEntry({
        username: "",
        aliasNotes: "",
        bougetList: "",
        admin_fee: "",
        password: "",
        validUntil: "",
        owner: "",
      });
      showSnackbar("Eintrag erfolgreich hinzugefügt!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [manualEntry, setEntries, showSnackbar]);

  // Einträge beim Laden abrufen
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const { data, error } = await supabase.from("entries").select("*");
        if (error) throw error;
        setEntries(data);
      } catch (error) {
        handleError(error, showSnackbar);
      }
    };
    fetchEntries();
  }, [setEntries, showSnackbar]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Einträge
      </Typography>

      {/* Filter- und Suchleiste */}
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
        <TextField
          label="Suche nach Benutzername oder Spitzname"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
          }}
          size="small"
          sx={{ width: isMobile ? "100%" : 300 }}
        />
        <TextField
          label="Gültig ab"
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ width: isMobile ? "100%" : 200 }}
        />
        <TextField
          label="Gültig bis"
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ width: isMobile ? "100%" : 200 }}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setSearchQuery("");
            setFilterStartDate("");
            setFilterEndDate("");
            setFilterTab("all");
          }}
          sx={{ height: 40 }}
        >
          Filter zurücksetzen
        </Button>
      </Box>

      {/* Tabs für Status- und Zahlungsfilter */}
      <Tabs
        value={filterTab}
        onChange={(e, newValue) => setFilterTab(newValue)}
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="Alle" value="all" />
        <Tab label="Aktiv" value="active" />
        <Tab label="Inaktiv" value="inactive" />
        <Tab label="Gezahlt" value="paid" />
        <Tab label="Nicht gezahlt" value="notpaid" />
      </Tabs>

      {/* Buttons zum Erstellen und manuellen Hinzufügen */}
      {role === "Admin" && (
        <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{ borderRadius: 1 }}
          >
            Neuer Eintrag
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => setOpenManualDialog(true)}
            sx={{ borderRadius: 1 }}
          >
            Bestehender Eintrag
          </Button>
        </Box>
      )}

      {/* Liste der gefilterten Einträge */}
      <Grid container spacing={1}>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <Grid item xs={12} key={entry.id}>
              <EntryAccordion
                entry={entry}
                role={role}
                loggedInUser={loggedInUser}
                setEntries={setEntries}
              />
            </Grid>
          ))
        ) : (
          <Typography>Keine Einträge gefunden.</Typography>
        )}
      </Grid>

      {/* Dialog zum Erstellen neuer Einträge */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
          Neuer Eintrag
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Benutzername *"
              value={newEntry.username}
              onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Spitzname *"
              value={newEntry.aliasNotes}
              onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Bouget-Liste"
              value={newEntry.bougetList}
              onChange={(e) => setNewEntry({ ...newEntry, bougetList: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Admin-Gebühr (€)"
              value={newEntry.admin_fee}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                const numValue = value ? parseInt(value) : "";
                if (numValue > 999) return;
                setNewEntry({ ...newEntry, admin_fee: numValue });
              }}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Passwort"
              value={newEntry.password}
              onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Gültig bis *"
              type="date"
              value={newEntry.validUntil}
              onChange={(e) => setNewEntry({ ...newEntry, validUntil: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenCreateDialog(false)}
            color="secondary"
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleCreateEntry}
            color="success"
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für manuelles Hinzufügen bestehender Einträge */}
      <Dialog
        open={openManualDialog}
        onClose={() => setOpenManualDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
          Bestehender Eintrag
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Benutzername *"
              value={manualEntry.username}
              onChange={(e) => setManualEntry({ ...manualEntry, username: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Spitzname *"
              value={manualEntry.aliasNotes}
              onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Bouget-Liste"
              value={manualEntry.bougetList}
              onChange={(e) => setManualEntry({ ...manualEntry, bougetList: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Admin-Gebühr (€)"
              value={manualEntry.admin_fee}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                const numValue = value ? parseInt(value) : "";
                if (numValue > 999) return;
                setManualEntry({ ...manualEntry, admin_fee: numValue });
              }}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Passwort"
              value={manualEntry.password}
              onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Gültig bis *"
              type="date"
              value={manualEntry.validUntil}
              onChange={(e) => setManualEntry({ ...manualEntry, validUntil: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Ersteller *"
              value={manualEntry.owner}
              onChange={(e) => setManualEntry({ ...manualEntry, owner: e.target.value })}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenManualDialog(false)}
            color="secondary"
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleManualEntry}
            color="success"
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
