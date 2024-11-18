import "./style.css";
import { io } from "socket.io-client";

// Optimized display media constraints for better streaming
const displayMediaOptions: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: 640, max: 1280 }, // Flexible resolution
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 15, max: 30 }, // Balanced frame rate
  },
  audio: true, // Include audio
};

const local = document.getElementById("local") as HTMLVideoElement;

const remote = document.getElementById("remote") as HTMLVideoElement;

const peerConnection = new RTCPeerConnection();

// Event listeners for UI controls
document.getElementById("startVideo")!.addEventListener("click", onStartVideo);

const socket = io("http://192.168.1.21:3000", {
  transports: ["websocket", "polling", "flashsocket"],
});

peerConnection.onicecandidate = (e) => {
  if (e.candidate) {
    console.log("onicecandidate");
    socket.emit("candidate", e.candidate);
  }
};
peerConnection.oniceconnectionstatechange = (e) => {
  console.log(e);
};

socket.on("connect", () => {
  console.log("successfully connected to the signaling server!");
});

socket.on("room_users", (data) => {
  console.log("join: " + data);
  createOffer();
});

socket.on("getCandidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).then(() => {
    console.log("candidate add success");
  });
});

const createOffer = async () => {
  console.log("create offer");
  const sdp = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });

  peerConnection.setLocalDescription(sdp);
  socket.emit("offer", sdp);
};

socket.on("getOffer", (sdp) => {
  console.log("get offer:", sdp);
  createAnswer(sdp);
});

socket.on("getAnswer", (sdp) => {
  console.log("get answer:" + sdp);
  peerConnection.setRemoteDescription(sdp);
});

const createAnswer = (sdp: any) => {
  peerConnection.setRemoteDescription(sdp).then(() => {
    console.log("answer set remote description success");
    peerConnection
      .createAnswer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      })
      .then((sdp1) => {
        console.log("create answer");
        peerConnection.setLocalDescription(sdp1);
        socket.emit("answer", sdp1);
      })
      .catch((error) => {
        console.log(error);
      });
  });
};

const joinRoom = () => {
  socket.emit("join", {
    room: 1234,
    name: "skydoves@getstream.io",
  });
};

peerConnection.onicecandidate = (e) => {
  if (e.candidate) {
    console.log("onicecandidate");
    socket.emit("candidate", e.candidate);
  }
};
peerConnection.oniceconnectionstatechange = (e) => {
  console.log(e);
};

peerConnection.ontrack = (ev) => {
  console.log("add remotetrack success");
  if (remote) remote.srcObject = ev.streams[0];
  remote.onloadedmetadata = () => local.play();
};

// Starts capturing the screen with optimized constraints
async function onStartVideo() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );
    local.srcObject = stream;
    local.onloadedmetadata = () => local.play();

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    console.log("Local stream started");
  } catch (error) {
    console.error("Error starting screen capture:", error);
  }
}
const name = prompt("gimme name:");
socket.emit("join", {
  room: 1234,
  name: name,
});

console.log("fawwad im here", peerConnection);
