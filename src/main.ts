import "./style.css";

// Optimized display media constraints for better streaming
const displayMediaOptions: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: 640, max: 1280 }, // Flexible resolution
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 15, max: 30 }, // Balanced frame rate
  },
  audio: true, // Include audio
};

let peerConnection: RTCPeerConnection | null = null;

const local = document.getElementById("local") as HTMLVideoElement;
const remote = document.getElementById("remote") as HTMLVideoElement;

let isDataStreaming = false;

// Use a shared broadcast channel for signaling
const channel = new BroadcastChannel("stream-video");

channel.onmessageerror = (e) => {
  console.error("BroadcastChannel error:", e);
};

channel.onmessage = async (e) => {
  const { type, candidate, sdp } = e.data;
  if (type === "icecandidate" && candidate) {
    console.log("Received ICE candidate:", candidate);
    await peerConnection?.addIceCandidate(candidate).catch(console.error);
  } else if (type === "answer" && isDataStreaming) {
    console.log("Received answer");
    await peerConnection?.setRemoteDescription({ type, sdp });
  } else if (type === "offer") {
    console.log("Received offer");
    local.style.display = "none"; // Hide local video during offer handling
    await handleOffer({ type, sdp });
  }
};

// Event listeners for UI controls
document.getElementById("startVideo")!.addEventListener("click", onStartVideo);
document
  .getElementById("startStream")!
  .addEventListener("click", onStartStream);

// Starts capturing the screen with optimized constraints
async function onStartVideo() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );
    local.srcObject = stream;
    local.onloadedmetadata = () => local.play();
    console.log("Local stream started");
  } catch (error) {
    console.error("Error starting screen capture:", error);
  }
}

// Starts the WebRTC streaming process
async function onStartStream() {
  if (!local.srcObject) {
    console.error("No local stream available for streaming");
    return;
  }

  isDataStreaming = true;

  // Create a new peer connection
  peerConnection = new RTCPeerConnection();

  // Handle ICE candidates
  peerConnection.addEventListener("icecandidate", (e) => {
    if (e.candidate) {
      console.log("Sending ICE candidate:", e.candidate);
      channel.postMessage({
        type: "icecandidate",
        candidate: e.candidate.toJSON(),
      });
    }
  });

  // Add local tracks to the connection
  const stream = local.srcObject as MediaStream;
  stream.getTracks().forEach((track) => {
    console.log("Adding track:", track);
    peerConnection!.addTrack(track, stream);
  });

  // Create and send an SDP offer
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });

  await peerConnection.setLocalDescription(offer);
  console.log("Sending offer:", offer.sdp);
  channel.postMessage({ type: "offer", sdp: offer.sdp });
}

// Handles incoming SDP offers
async function handleOffer(offer: RTCSessionDescriptionInit) {
  peerConnection = new RTCPeerConnection();

  // Handle remote tracks
  peerConnection.addEventListener("track", (e) => {
    console.log("Track received:", e.track);
    const [stream] = e.streams;
    if (stream) {
      remote.srcObject = stream;
      remote.onloadedmetadata = () => remote.play();
    } else {
      console.warn("No stream available, creating new MediaStream");
      remote.srcObject = new MediaStream([e.track]);
      remote.onloadedmetadata = () => remote.play();
    }
  });

  // Handle ICE candidates
  peerConnection.addEventListener("icecandidate", (e) => {
    if (e.candidate) {
      console.log("Sending ICE candidate:", e.candidate);
      channel.postMessage({
        type: "icecandidate",
        candidate: e.candidate.toJSON(),
      });
    }
  });

  // Set remote description and create an answer
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  console.log("Sending answer:", answer.sdp);
  channel.postMessage({ type: "answer", sdp: answer.sdp });
}
