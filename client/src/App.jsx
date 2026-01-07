import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const GRID_SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const coordKey = (x, y) => `${x},${y}`;

function isPlacementValid(ships) {
  if (ships.length > SHIP_LENGTHS.length) return false;
  const used = new Set();
  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    if (ship.length !== SHIP_LENGTHS[i]) return false;
    if (ship.x < 0 || ship.y < 0 || ship.x >= GRID_SIZE || ship.y >= GRID_SIZE) {
      return false;
    }
    for (let j = 0; j < ship.length; j++) {
      const cx = ship.orientation === "H" ? ship.x + j : ship.x;
      const cy = ship.orientation === "V" ? ship.y + j : ship.y;
      if (cx >= GRID_SIZE || cy >= GRID_SIZE) return false;
      const key = coordKey(cx, cy);
      if (used.has(key)) return false;
      used.add(key);
    }
  }
  return true;
}

function buildShipCells(ships) {
  const cells = new Set();
  ships.forEach((ship) => {
    for (let i = 0; i < ship.length; i++) {
      const cx = ship.orientation === "H" ? ship.x + i : ship.x;
      const cy = ship.orientation === "V" ? ship.y + i : ship.y;
      cells.add(coordKey(cx, cy));
    }
  });
  return cells;
}

function randomPlacement() {
  const placements = [];
  const occupied = new Set();

  for (const length of SHIP_LENGTHS) {
    let placed = false;
    let guard = 0;
    while (!placed && guard < 1000) {
      guard++;
      const orientation = Math.random() > 0.5 ? "H" : "V";
      const maxX = orientation === "H" ? GRID_SIZE - length : GRID_SIZE - 1;
      const maxY = orientation === "V" ? GRID_SIZE - length : GRID_SIZE - 1;
      const x = Math.floor(Math.random() * (maxX + 1));
      const y = Math.floor(Math.random() * (maxY + 1));
      const coords = [];
      let clash = false;
      for (let i = 0; i < length; i++) {
        const cx = orientation === "H" ? x + i : x;
        const cy = orientation === "V" ? y + i : y;
        const key = coordKey(cx, cy);
        if (occupied.has(key)) {
          clash = true;
          break;
        }
        coords.push(key);
      }
      if (!clash) {
        coords.forEach((c) => occupied.add(c));
        placements.push({ x, y, length, orientation });
        placed = true;
      }
    }
  }

  return placements;
}

function randomRoomId() {
  return Math.random().toString(36).slice(2, 7);
}

// Liste de mots interdits (offensants, racistes, etc.)
const FORBIDDEN_WORDS = [
  // Insultes communes
  "connard", "salope", "pute", "putain", "merde", "enculé", "fdp", "pd", "tg", "ntm",
  // Termes racistes et discriminatoires
  "nazi", "hitler", "kkk", "négro", "bamboula", "bougnoule", "youpin", "sale juif",
  // Termes offensants en anglais
  "fuck", "shit", "bitch", "asshole", "nigger", "nigga", "kike", "spic", "chink", "gook",
  // Autres termes offensants
  "retard", "mongol", "autiste", "handicapé",
];

// Normalise le texte pour la comparaison (minuscules, sans accents)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]/g, ""); // Garde seulement lettres et chiffres
}

// Vérifie si un texte contient des mots interdits
function containsForbiddenWords(text) {
  if (!text || text.trim().length === 0) return false;
  const normalized = normalizeText(text);
  return FORBIDDEN_WORDS.some((word) => normalized.includes(normalizeText(word)));
}

// Valide un pseudo ou un code de salle
function validateInput(input, type = "pseudo") {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: type === "pseudo" ? "Le pseudo ne peut pas être vide" : "Le code ne peut pas être vide" };
  }

  const trimmed = input.trim();

  // Vérification de la longueur
  if (type === "pseudo") {
    if (trimmed.length < 2) {
      return { valid: false, error: "Le pseudo doit contenir au moins 2 caractères" };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: "Le pseudo ne peut pas dépasser 20 caractères" };
    }
  } else {
    // Code de salle
    if (trimmed.length < 3) {
      return { valid: false, error: "Le code doit contenir au moins 3 caractères" };
    }
    if (trimmed.length > 15) {
      return { valid: false, error: "Le code ne peut pas dépasser 15 caractères" };
    }
  }

  // Vérification des mots interdits
  if (containsForbiddenWords(trimmed)) {
    return { valid: false, error: "Ce nom contient des mots interdits. Veuillez choisir un autre nom." };
  }

  // Vérification des caractères autorisés (lettres, chiffres, espaces, tirets, underscores)
  const allowedPattern = /^[a-zA-Z0-9\s\-_àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ]+$/;
  if (!allowedPattern.test(trimmed)) {
    return { valid: false, error: "Caractères non autorisés. Utilisez seulement des lettres, chiffres, espaces, tirets et underscores." };
  }

  return { valid: true, error: null };
}

function App() {
  const socket = useMemo(
    () =>
      io("https://mmi23d12.mmi-troyes.fr", {
        path: "/bataille-navale/socket.io",
        transports: ["websocket", "polling"],
        autoConnect: false,
      }),
    []
  );
  const [myId, setMyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [connected, setConnected] = useState(false);
  const [connError, setConnError] = useState("");
  const [manualShips, setManualShips] = useState([]);
  const [codeVisible, setCodeVisible] = useState(false);
  const [actionMode, setActionMode] = useState(null); // "create" | "join"
  const [draftShip, setDraftShip] = useState(null); // {length, cells: [{x,y}], orientation}
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      setMyId(socket.id);
      setConnected(true);
      setInfo("");
      setConnError("");
    };
    const handleState = (state) => {
      setGameState(state);
      setError("");
    };
    const handleErrorMessage = (message) => setError(message);
    const handleInfo = (message) => setInfo(message);
    const handleDisconnect = () => {
      setConnected(false);
      setInfo("Déconnecté du serveur");
    };
    const handleConnectError = (err) => {
      setConnected(false);
      setConnError(err?.message || "connect_error");
    };

    socket.on("connect", handleConnect);
    socket.on("state", handleState);
    socket.on("errorMessage", handleErrorMessage);
    socket.on("info", handleInfo);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Lancer la connexion après avoir attaché les handlers
    socket.connect();
    // Si déjà connecté (cas où autoConnect false mais le socket se reconnecte), maj état
    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", () => {
      setMyId(socket.id);
      setConnected(true);
      setInfo("");
      setConnError("");
    });
    socket.on("state", (state) => {
      setGameState(state);
      setError("");
    });
    socket.on("errorMessage", (message) => setError(message));
    socket.on("info", (message) => setInfo(message));
    socket.on("disconnect", () => {
      setConnected(false);
      setInfo("Déconnecté du serveur");
    });
    return () => {
      socket.off("connect", handleConnect);
      socket.off("state", handleState);
      socket.off("errorMessage", handleErrorMessage);
      socket.off("info", handleInfo);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    };
  }, [socket]);

  const handleCreate = () => {
    // Validation du pseudo
    const nameValidation = validateInput(name, "pseudo");
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      return;
    }

    // Validation du code de salle si fourni
    if (roomId) {
      const roomValidation = validateInput(roomId, "room");
      if (!roomValidation.valid) {
        setError(roomValidation.error);
        return;
      }
    }

    const id = roomId || randomRoomId();
    setRoomId(id);
    socket.emit("createRoom", { roomId: id, name: name.trim() });
    setError("");
  };

  const handleJoin = () => {
    // Validation du pseudo
    const nameValidation = validateInput(name, "pseudo");
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      return;
    }

    // Validation du code de salle
    if (!roomId) {
      setError("Choisissez un identifiant de salle");
      return;
    }

    const roomValidation = validateInput(roomId, "room");
    if (!roomValidation.valid) {
      setError(roomValidation.error);
      return;
    }

    socket.emit("joinRoom", { roomId: roomId.trim(), name: name.trim() });
    setError("");
  };

  const handleAutoPlace = () => {
    const ships = randomPlacement();
    setManualShips(ships);
    setDraftShip(null);
    socket.emit("placeShips", { roomId, ships });
  };

  const handleManualPlace = (x, y) => {
    if (!gameState || you?.placed) return;
    const index = manualShips.length;
    if (index >= SHIP_LENGTHS.length) {
      setError("Tous les bateaux sont déjà placés");
      return;
    }

    const length = SHIP_LENGTHS[index];
    const occupied = buildShipCells(manualShips);
    const key = coordKey(x, y);
    if (occupied.has(key)) {
      setError("Cette case est déjà occupée");
      return;
    }

    // Démarrer un nouveau navire
    if (!draftShip) {
      setDraftShip({ length, cells: [{ x, y }], orientation: null });
      setError("");
      return;
    }

    // Ajouter une case au navire en cours
    const { cells, orientation } = draftShip;
    // Vérifier que la case n'est pas déjà dans le draft
    if (cells.some((c) => c.x === x && c.y === y)) {
      setError("Case déjà sélectionnée pour ce navire");
      return;
    }

    // Déterminer ou valider l'orientation
    let nextOrientation = orientation;
    if (!nextOrientation) {
      const first = cells[0];
      if (first.x === x) nextOrientation = "V";
      else if (first.y === y) nextOrientation = "H";
      else {
        setError("Choisissez des cases alignées");
        return;
      }
    } else {
      if ((nextOrientation === "H" && cells[0].y !== y) || (nextOrientation === "V" && cells[0].x !== x)) {
        setError("Restez sur la même ligne ou colonne");
        return;
      }
    }

    const updatedCells = [...cells, { x, y }];
    // Vérifier continuité (pas de trou)
    if (nextOrientation === "H") {
      const xs = updatedCells.map((c) => c.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      if (maxX - minX + 1 !== updatedCells.length) {
        setError("Placez les cases côte à côte");
        return;
      }
    } else if (nextOrientation === "V") {
      const ys = updatedCells.map((c) => c.y);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      if (maxY - minY + 1 !== updatedCells.length) {
        setError("Placez les cases côte à côte");
        return;
      }
    }

    if (updatedCells.length > length) {
      setError(`Ce navire fait ${length} cases`);
      return;
    }

    // Si navire complet, valider et enregistrer
    if (updatedCells.length === length) {
      const xs = updatedCells.map((c) => c.x);
      const ys = updatedCells.map((c) => c.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const ship = { x: minX, y: minY, length, orientation: nextOrientation };
      const candidate = [...manualShips, ship];
      if (!isPlacementValid(candidate)) {
        setError("Placement invalide (chevauchement ou hors grille)");
        return;
      }
      setManualShips(candidate);
      setDraftShip(null);
      setError("");
      if (candidate.length === SHIP_LENGTHS.length) {
        socket.emit("placeShips", { roomId, ships: candidate });
        setInfo("Bateaux placés, en attente de l'adversaire");
      }
      return;
    }

    // Sinon continuer le placement
    setDraftShip({ length, cells: updatedCells, orientation: nextOrientation });
    setError("");
  };

  const handleUndoManual = () => {
    if (draftShip) {
      setDraftShip(null);
    } else {
      setManualShips((prev) => prev.slice(0, -1));
    }
    setError("");
  };

  const handleClearManual = () => {
    setManualShips([]);
    setDraftShip(null);
    setError("");
  };

  const handleFire = (x, y) => {
    if (!gameState) return;
    if (gameState.turn !== myId || gameState.winner) return;
    socket.emit("fire", { roomId, x, y });
  };

  const handleReset = () => {
    socket.emit("reset", { roomId });
    setManualShips([]);
    setDraftShip(null);
    setError("");
  };

  const you = gameState?.you;
  const opponent = gameState?.opponent;
  const myTurn = gameState?.turn === myId;

  useEffect(() => {
    if (gameState?.winner) {
      setWinnerModalOpen(true);
    } else {
      setWinnerModalOpen(false);
    }
  }, [gameState?.winner]);

  useEffect(() => {
    if (!gameState || you?.placed) {
      setManualShips([]);
      setDraftShip(null);
    }
  }, [gameState, you?.placed]);

  const shipsToShow = you?.placed ? you.ships || [] : manualShips;
  const draftCells = draftShip ? draftShip.cells.map((c) => coordKey(c.x, c.y)) : [];
  const yourShipCells = new Set([...buildShipCells(shipsToShow), ...draftCells]);
  const yourHitsTaken = new Set(you?.hitsTaken || []);
  const yourShots = new Set(you?.shotsFired || []);
  const yourHitsOnOpponent = new Set(you?.hitsOnOpponent || []);

  const placedShips = you?.placed ? SHIP_LENGTHS.length : manualShips.length;
  const opponentPlaced = opponent?.placed ? SHIP_LENGTHS.length : opponent?.ships?.length || 0;
  const shotsFired = you?.shotsFired?.length || 0;
  const hitsLanded = you?.hitsOnOpponent?.length || 0;
  const hitsTakenCount = you?.hitsTaken?.length || 0;

  const winnerName =
    gameState?.winner == null
      ? ""
      : gameState.winner === myId
      ? name || "Vous"
      : opponent?.name || "Adversaire";

  return (
    <div className="page">
      {winnerModalOpen && gameState?.winner && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="modal-title">Victoire !</p>
            <p className="modal-text">
              Le vainqueur est <strong>{winnerName}</strong>.
            </p>
            <div className="modal-actions">
              <button className="cta-small" onClick={() => setWinnerModalOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="hero">
        <div className="hero-text">
          <p className="eyebrow">Arène multijoueur</p>
          <h1>Bataille Navale Online</h1>
          <p className="subtitle">Créez votre salle, équipez votre flotte et prenez l'avantage tour par tour.</p>
          <div className="pills">
            <span className={`pill ${connected ? "pill-ok" : "pill-warn"}`}>{connected ? "Connecté" : "Hors ligne"}</span>
            {connError && <span className="pill pill-warn">Erreur : {connError}</span>}
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-label">Déploiement manuel</div>
          <p className="panel-text">
            Cliquez case par case pour construire chaque navire. L'orientation se verrouille après la 2ᵉ case (ligne ou colonne).
          </p>
          <p className="panel-text">
            {gameState
              ? myTurn
                ? "À vous de jouer, verrouillez vos tirs."
                : "L'adversaire prépare sa salve."
              : "Rejoignez ou créez une salle pour commencer."}
          </p>
        </div>
      </div>

      <section className="panel glass controls">
        <div className="inputs">
          <input
            placeholder="Votre pseudo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="cta-row">
          <button
            className="cta-btn create"
            onClick={() => {
              setActionMode("create");
              setCodeVisible(true);
            }}
          >
            Créer une partie
          </button>
          <button
            className="cta-btn join"
            onClick={() => {
              setActionMode("join");
              setCodeVisible(true);
            }}
          >
            Rejoindre une partie
          </button>
        </div>

        {codeVisible && (
          <div className="code-panel">
            <div className="code-fields">
              <input
                placeholder="Code de salle"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              {actionMode === "create" && gameState?.roomId && (
                <button
                  onClick={async () => {
                    const codeToCopy = gameState?.roomId;
                    if (!codeToCopy) return;
                    try {
                      await navigator.clipboard?.writeText(codeToCopy);
                      setInfo("Code copié dans le presse-papier");
                    } catch {
                      setError("Impossible de copier le code");
                    }
                  }}
                  className="cta-icon"
                  type="button"
                >
                  Copier
                </button>
              )}
              <button
                onClick={actionMode === "join" ? handleJoin : handleCreate}
                className="cta-small"
              >
                {actionMode === "join" ? "Rejoindre" : "Créer"}
              </button>
              <button className="ghost-btn" onClick={() => setCodeVisible(false)}>
                Fermer
              </button>
            </div>
            <p className="code-hint">
              {actionMode === "join"
                ? "Saisissez le code partagé par l'hôte."
                : "Laissez vide pour générer un code aléatoire."}
            </p>
          </div>
        )}

        <div className="actions">
          <button onClick={handleAutoPlace} disabled={!gameState}>
            Placement automatique
          </button>
          <button onClick={handleUndoManual} disabled={!gameState || you?.placed || manualShips.length === 0}>
            Annuler le dernier
          </button>
          <button onClick={handleClearManual} disabled={!gameState || you?.placed || manualShips.length === 0}>
            Effacer le placement
          </button>
          <button onClick={handleReset} disabled={!gameState}>
            Réinitialiser
          </button>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="alert info">
          {info ? info : "En attente d'ordres..."}
        </div>
        {gameState && (
          <div className="status">
            <span className="tag">Tour : {myTurn ? "À vous" : "Adversaire"}</span>
            {gameState.winner && (
              <span className="tag winner">
                Vainqueur : {gameState.winner === myId ? "Vous" : opponent?.name || "?"}
              </span>
            )}
          </div>
        )}
      </section>

      <section className="hud">
        <div className={`player-card ${you?.placed ? "ready" : ""}`}>
          <div className="card-header">
            <span className="badge">Votre équipe</span>
            <span className={`status-dot ${connected ? "on" : ""}`} />
          </div>
          <div className="card-name">{name || "Commandant"}</div>
          <div className="card-row">
            <span>Bateaux placés</span>
            <strong>{placedShips}/{SHIP_LENGTHS.length}</strong>
          </div>
          <div className="card-row">
            <span>Navire en cours</span>
            <strong>{draftShip ? `${draftShip.cells.length}/${draftShip.length}` : "—"}</strong>
          </div>
          <div className="card-row">
            <span>Tirs effectués</span>
            <strong>{shotsFired}</strong>
          </div>
          <div className="card-row">
            <span>Touchés subis</span>
            <strong>{hitsTakenCount}</strong>
          </div>
          <div className="card-footer">
            {you?.placed ? "En attente de l'adversaire" : "Placez vos navires sur la grille"}
          </div>
        </div>

        <div className={`player-card ${opponent?.placed ? "ready" : ""}`}>
          <div className="card-header">
            <span className="badge alt">Adversaire</span>
            <span className={`status-dot ${opponent ? "on" : ""}`} />
          </div>
          <div className="card-name">{opponent?.name || "En attente"}</div>
          <div className="card-row">
            <span>Bateaux placés</span>
            <strong>{opponentPlaced}/{SHIP_LENGTHS.length}</strong>
          </div>
          <div className="card-row">
            <span>Touchés reçus</span>
            <strong>{hitsLanded}</strong>
          </div>
          <div className="card-row">
            <span>Statut</span>
            <strong>{opponent?.placed ? "Prêt au combat" : "Positionnement"}</strong>
          </div>
          <div className="card-footer">
            {opponent ? "L'adversaire est connecté" : "En attente d'un challenger"}
          </div>
        </div>

        <div className="player-card neutral">
          <div className="card-header">
            <span className="badge alt">Objectif</span>
          </div>
          <div className="card-name">Contrôle de zone</div>
          <div className="card-row">
            <span>Phase actuelle</span>
            <strong>{gameState ? (gameState.winner ? "Fin de partie" : myTurn ? "Vos tirs" : "Défense") : "Préparation"}</strong>
          </div>
          <div className="card-row">
            <span>Victoire</span>
            <strong>{gameState?.winner ? (gameState.winner === myId ? "Vous" : opponent?.name || "Adversaire") : "Première flotte coulée"}</strong>
          </div>
          <div className="card-row">
            <span>Connexion</span>
            <strong>{connected ? "Canal ouvert" : "Recherche serveur"}</strong>
          </div>
          <div className="card-footer">
            Utilisez la grille de gauche pour placer vos bateaux, puis ciblez la grille de droite pour tirer.
          </div>
        </div>
      </section>

      <section className="boards">
        <div className="board-wrapper">
          <div className="board-head">
            <h2>Votre grille</h2>
            <span className="tag subtle">
              {manualShips.length}/{SHIP_LENGTHS.length} navires posés
              {draftShip ? ` • navire en cours ${draftShip.cells.length}/${draftShip.length}` : ""}
            </span>
          </div>
          <Grid
            highlight={yourShipCells}
            hits={yourHitsTaken}
            shots={new Set()}
            disabled={!gameState || you?.placed || !!gameState?.winner}
            onCellClick={handleManualPlace}
          />
          <p className="legend">
            Cliquez case par case pour compléter chaque navire, aligné sans trou. Impacts en rouge.
          </p>
        </div>
        <div className="board-wrapper">
          <div className="board-head">
            <h2>Grille adverse</h2>
            <span className="tag subtle">Tirs : {shotsFired}</span>
          </div>
          <Grid
            shots={yourShots}
            hits={yourHitsOnOpponent}
            disabled={!myTurn || !you?.placed || !opponent?.placed || !!gameState?.winner}
            onCellClick={handleFire}
          />
          <p className="legend">
            Rouge = touché, gris = manqué. Tirez uniquement quand c'est votre tour.
          </p>
        </div>
      </section>
    </div>
  );
}

function Grid({ highlight = new Set(), hits = new Set(), shots = new Set(), disabled, onCellClick }) {
  return (
    <div className={`grid ${disabled ? "disabled" : ""}`}>
      {Array.from({ length: GRID_SIZE }).map((_, y) =>
        Array.from({ length: GRID_SIZE }).map((_, x) => {
          const key = coordKey(x, y);
          const hasShip = highlight.has(key);
          const isHit = hits.has(key);
          const isShot = shots.has(key);
          const cellClass = [
            hasShip ? "ship" : "",
            isHit ? "hit" : "",
            isShot && !isHit ? "miss" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              className={`cell ${cellClass}`}
              onClick={() => !disabled && onCellClick?.(x, y)}
              disabled={disabled || isShot}
              title={`${x},${y}`}
            />
          );
        })
      )}
    </div>
  );
}

export default App;
