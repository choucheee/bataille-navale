import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Orientation = "H" | "V";

type ShipPlacement = {
  x: number;
  y: number;
  length: number;
  orientation: Orientation;
};

type PlayerState = {
  id: string; // socket id
  name: string;
  placed: boolean;
  ships: ShipPlacement[];
  shipCells: Set<string>; // coordinates occupied by ships
  hitsTaken: Set<string>;
  shotsFired: Set<string>;
  hitsOnOpponent: Set<string>;
};

type Room = {
  id: string;
  players: Map<string, PlayerState>;
  turn: string | null; // socket id of current player
  winner: string | null;
};

const GRID_SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

const app = express();
app.use(cors());

// Servir les fichiers statiques du client en production
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// Route catch-all pour le SPA (doit être après les routes API)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const rooms = new Map<string, Room>();

const coordKey = (x: number, y: number) => `${x},${y}`;

function isPlacementValid(ships: ShipPlacement[]): boolean {
  if (ships.length !== SHIP_LENGTHS.length) return false;

  const used = new Set<string>();

  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    if (ship.length !== SHIP_LENGTHS[i]) return false;
    if (
      ship.x < 0 ||
      ship.y < 0 ||
      ship.x >= GRID_SIZE ||
      ship.y >= GRID_SIZE
    )
      return false;

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

function placementsToCells(ships: ShipPlacement[]): Set<string> {
  const set = new Set<string>();
  ships.forEach((ship) => {
    for (let j = 0; j < ship.length; j++) {
      const cx = ship.orientation === "H" ? ship.x + j : ship.x;
      const cy = ship.orientation === "V" ? ship.y + j : ship.y;
      set.add(coordKey(cx, cy));
    }
  });
  return set;
}

function getOpponent(room: Room, socketId: string): PlayerState | null {
  for (const [id, player] of room.players.entries()) {
    if (id !== socketId) return player;
  }
  return null;
}

function emitState(room: Room) {
  for (const player of room.players.values()) {
    const opponent = getOpponent(room, player.id);
    io.to(player.id).emit("state", {
      roomId: room.id,
      you: {
        name: player.name,
        placed: player.placed,
        hitsTaken: Array.from(player.hitsTaken),
        ships: player.ships,
        shotsFired: Array.from(player.shotsFired),
        hitsOnOpponent: Array.from(player.hitsOnOpponent),
      },
      opponent: opponent
        ? {
            name: opponent.name,
            placed: opponent.placed,
            hitsTaken: Array.from(opponent.hitsTaken),
            shotsReceived: Array.from(opponent.shotsFired),
            hitsOnYou: Array.from(opponent.hitsOnOpponent),
          }
        : null,
      turn: room.turn,
      winner: room.winner,
    });
  }
}

io.on("connection", (socket: Socket) => {
  socket.on("createRoom", ({ roomId, name }: { roomId: string; name: string }) => {
    if (!roomId || rooms.has(roomId)) {
      socket.emit("errorMessage", "Salle indisponible");
      return;
    }

    const player: PlayerState = {
      id: socket.id,
      name: name || "Joueur 1",
      placed: false,
      ships: [],
      shipCells: new Set(),
      hitsTaken: new Set(),
      shotsFired: new Set(),
      hitsOnOpponent: new Set(),
    };

    const room: Room = {
      id: roomId,
      players: new Map([[socket.id, player]]),
      turn: null,
      winner: null,
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    emitState(room);
  });

  socket.on("joinRoom", ({ roomId, name }: { roomId: string; name: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("errorMessage", "Salle introuvable");
      return;
    }
    if (room.players.size >= 2) {
      socket.emit("errorMessage", "Salle pleine");
      return;
    }

    const player: PlayerState = {
      id: socket.id,
      name: name || "Joueur 2",
      placed: false,
      ships: [],
      shipCells: new Set(),
      hitsTaken: new Set(),
      shotsFired: new Set(),
      hitsOnOpponent: new Set(),
    };

    room.players.set(socket.id, player);
    room.turn = room.turn ?? socket.id;
    socket.join(roomId);
    emitState(room);
  });

  socket.on(
    "placeShips",
    ({ roomId, ships }: { roomId: string; ships: ShipPlacement[] }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      if (room.winner) return;
      if (!isPlacementValid(ships)) {
        socket.emit("errorMessage", "Placement invalide");
        return;
      }

      player.ships = ships;
      player.shipCells = placementsToCells(ships);
      player.placed = true;

      const opponent = getOpponent(room, socket.id);
      if (opponent && opponent.placed && !room.turn) {
        room.turn = socket.id;
      }

      emitState(room);
    }
  );

  socket.on("fire", ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || room.turn !== socket.id || room.winner) return;
    const opponent = getOpponent(room, socket.id);
    if (!opponent) return;
    if (!opponent.placed || !player.placed) {
      socket.emit("errorMessage", "Les deux joueurs doivent placer leurs bateaux");
      return;
    }
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;

    const shotKey = coordKey(x, y);
    if (player.shotsFired.has(shotKey)) return;
    player.shotsFired.add(shotKey);

    if (opponent.shipCells.has(shotKey)) {
      opponent.hitsTaken.add(shotKey);
      player.hitsOnOpponent.add(shotKey);
      // Vérifier victoire
      const allOpponentCells = opponent.shipCells.size;
      if (opponent.hitsTaken.size >= allOpponentCells) {
        room.winner = socket.id;
      }
    } else {
      room.turn = opponent.id;
    }

    emitState(room);
  });

  socket.on("reset", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.players.has(socket.id)) return;
    room.players.forEach((player) => {
      player.placed = false;
      player.ships = [];
      player.shipCells = new Set();
      player.hitsTaken = new Set();
      player.shotsFired = new Set();
      player.hitsOnOpponent = new Set();
    });
    room.turn = null;
    room.winner = null;
    emitState(room);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        io.to(roomId).emit("info", "Un joueur s'est déconnecté");
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          room.turn = null;
          room.winner = null;
          emitState(room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
httpServer.listen(Number(PORT), HOST, () => {
  console.log(`Serveur prêt sur ${HOST}:${PORT}`);
});

