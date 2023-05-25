const app = require("express")()
const server = require("http").createServer(app)
const cors = require("cors")

app.use(cors())
let connectedUsers = []

const connectUser = (user) => {
  //   const foundUser = connectedUsers.filter((user) => {
  //     return user.uid === user.uid
  //   })

  connectedUsers.push(user)
  console.log(connectedUsers)
}
// create socket server
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// app.use(express.json())

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
})

// start server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
