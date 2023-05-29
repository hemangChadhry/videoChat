const app = require("express")()
const server = require("http").createServer(app)
const cors = require("cors")
const { ExpressPeerServer } = require("peer")

app.use(cors())
let connectedUsers = []

const connectUser = (user) => {
  connectedUsers.push(user)
  console.log(connectedUsers)
}
const peerServer = ExpressPeerServer(server, {
  debug: true,
})

// create socket server
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const broadcastEventTypes = {
  ACTIVE_USERS: "ACTIVE_USERS",
  GROUP_CALL_ROOMS: "GROUP_CALL_ROOMS",
}

// app.use(express.json())

app.use("/peerjs", peerServer)

app.get("/", (req, res) => {
  res.send("Running")
})

io.on("connection", (socket) => {
  console.log("a new user connected", socket.id)
  socket.emit("mySocket", socket.id)

  socket.on("userAlreadyPresent", (data) => {
    console.log(typeof data)
    connectUser({ ...data, socketid: socket.id })
    if (data.type === "src") {
      const srcList = connectedUsers.filter((i) => i.type === "src")

      io.emit("newSrc", srcList)
    }
    if (data.type === "patient") {
      const patientList = connectedUsers.filter((i) => i.type === "patient")
      io.emit("patientListForSrc", patientList)
    }
    if (data.type === "doctor") {
      const doctorList = connectedUsers.filter((i) => i.type === "doctor")
      io.emit("doctorListForSrc", doctorList)
    }
  })

  socket.on("disconnect", () => {
    console.log("a user disconnected ", socket.id)
    connectedUsers = connectedUsers.filter((i) => i.socketid !== socket.id)
    io.emit("userDisconnected", socket.id)
    console.log(connectedUsers)
  })

  socket.on("login", (data) => {
    connectUser({ ...data, socketid: socket.id })
    if (data.type === "src") {
      const srcList = connectedUsers.filter((i) => i.type === "src")

      io.emit("newSrc", srcList)
    }
    if (data.type === "patient") {
      const patientList = connectedUsers.filter((i) => i.type === "patient")
      io.emit("patientListForSrc", patientList)
    }
    if (data.type === "doctor") {
      const doctorList = connectedUsers.filter((i) => i.type === "doctor")
      io.emit("doctorListForSrc", doctorList)
    }
  })

  socket.on("srcList", (data) => {
    const srcList = connectedUsers.filter((i) => i.type === "src")
    io.emit("newSrc", srcList)
  })
  socket.on("patientList", (data) => {
    const patientList = connectedUsers.filter((i) => i.type === "patient")
    io.emit("patientListForSrc", patientList)
  })

  socket.on("doctorList", (data) => {
    const doctorList = connectedUsers.filter((i) => i.type === "doctor")
    io.emit("doctorListForSrc", doctorList)
  })

  socket.on("sendMessage", (data) => {
    io.emit("getMessage", data)
  })
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name })
  })

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal)
  })

  socket.on("hangup", (data) => {
    data.map((id) => {
      if (id !== "") {
        io.to(id).emit("hangup")
      }
    })
  })

  socket.on("assign", (data) => {
    // doc and patient
    const doctor = data.doc
    const patient = data.patient
    io.to(doctor.socketid).emit("patientAssigned", patient)
    io.to(patient.socketid).emit("doctorAssigned", doctor)
  })
  socket.on("mute", (data) => {
    io.to(data).emit("mute", data)
  })

  // new code
  socket.on("register-new-user", (data) => {
    peers.push({
      username: data.username,
      type: data.type,
      socketId: data.socketId,
    })
    console.log("registered new user")
    console.log(peers)

    io.sockets.emit("broadcast", {
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: peers,
    })

    io.sockets.emit("broadcast", {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    })
  })

  // socket.on("disconnect", () => {
  //   console.log("user disconnected")
  //   // when the user disconnects remove it from peer array
  //   peers = peers.filter((peer) => peer.socketId !== socket.id)
  //   io.sockets.emit("broadcast", {
  //     event: broadcastEventTypes.ACTIVE_USERS,
  //     activeUsers: peers,
  //   })

  //   groupCallRooms = groupCallRooms.filter(
  //     (room) => room.socketId !== socket.id
  //   )
  //   io.sockets.emit("broadcast", {
  //     event: broadcastEventTypes.GROUP_CALL_ROOMS,
  //     groupCallRooms,
  //   })
  // })

  // listeners related with direct call

  socket.on("pre-offer", (data) => {
    console.log("pre-offer data", data)
    io.to(data.callee.socketid).emit("pre-offer", {
      callerUsername: data.caller.username,
      callerSocketId: socket.id,
    })
  })

  socket.on("pre-offer-answer", (data) => {
    console.log("handling pre offer answer", data.callersSocketId)
    io.to(data.callerSocketId).emit("pre-offer-answer", {
      answer: data.answer,
    })
  })

  socket.on("webRTC-offer", (data) => {
    // console.log("handling webRTC offer", data)
    io.to(data.calleeSocketId).emit("webRTC-offer", {
      offer: data.offer,
    })
  })

  socket.on("webRTC-answer", (data) => {
    console.log("handling webRTC answer")
    io.to(data.callerSocketId).emit("webRTC-answer", {
      answer: data.answer,
    })
  })

  socket.on("webRTC-candidate", (data) => {
    io.to(data.connectedUserSocketId).emit("webRTC-candidate", {
      candidate: data.candidate,
    })
  })

  socket.on("user-hanged-up", (data) => {
    io.to(data.connectedUserSocketId).emit("user-hanged-up")
  })

  // listeners related with group call
  socket.on("group-call-register", (data) => {
    const roomId = uuidv4()
    socket.join(roomId)

    const newGroupCallRoom = {
      peerId: data.peerId,
      hostName: data.username,
      socketId: socket.id,
      roomId: roomId,
    }

    groupCallRooms.push(newGroupCallRoom)
    io.sockets.emit("broadcast", {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    })
  })

  socket.on("group-call-join-request", (data) => {
    io.to(data.roomId).emit("group-call-join-request", {
      peerId: data.peerId,
      streamId: data.streamId,
    })

    socket.join(data.roomId)
  })

  socket.on("group-call-user-left", (data) => {
    socket.leave(data.roomId)

    io.to(data.roomId).emit("group-call-user-left", {
      streamId: data.streamId,
    })
  })

  socket.on("group-call-closed-by-host", (data) => {
    groupCallRooms = groupCallRooms.filter(
      (room) => room.peerId !== data.peerId
    )

    io.sockets.emit("broadcast", {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    })
  })
})

// start server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
