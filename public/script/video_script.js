const socket = io();
let remote;
let local;
let peerConnection;
let rtcSetting = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let initializeConnection = async () => {
  socket.on("signalingMessage", handleSignalingMessage);

  try {
    // Request media stream (audio and video)
    local = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // Proceed to initiate the offer
    await initiateOffer();
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
};

let initiateOffer = async () => {
  try {
    await createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signalingMessage", JSON.stringify({ type: "offer", offer }));
  } catch (error) {
    console.error("Error during the offer creation process.", error);
  }
};

let createPeerConnection = async () => {
  console.log("Creating peer connection");

  try {
    peerConnection = new RTCPeerConnection(rtcSetting);

    remote = new MediaStream();
    document.querySelector("#remoteVideo").srcObject = remote;
    document.querySelector("#remoteVideo").style.display = "block";

    local.getTracks().forEach((track) => {
      peerConnection.addTrack(track, local);
    });

    document.querySelector("#localVideo").srcObject = local;
    document.querySelector("#localVideo").style.display = "block";

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(
          "signalingMessage",
          JSON.stringify({ type: "candidate", candidate: event.candidate })
        );
      }
    };
  } catch (error) {
    console.error("Error creating the peer connection.", error);
  }
};

const handleSignalingMessage = async (message) => {
  try {
    const { type, offer, answer, candidate } = JSON.parse(message);

    if (type === "offer") await handleOffer(offer);
    if (type === "answer") await handleAnswer(answer);
    if (type === "candidate" && peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  } catch (error) {
    console.error("Error handling signaling message.", error);
  }
};

const handleOffer = async (offer) => {
  console.log("Handling offer", offer);

  try {
    await createPeerConnection();
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("signalingMessage", JSON.stringify({ type: "answer", answer }));
  } catch (error) {
    console.error("Error handling offer.", error);
  }
};

const handleAnswer = async (answer) => {
  try {
    if (!peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(answer);
    }
  } catch (error) {
    console.error("Error handling answer.", error);
  }
};

initializeConnection();

document.querySelector(".end").addEventListener("click", () => {
  try {
    peerConnection.close();
    document.querySelector("#localVideo").srcObject = null;
    socket.disconnect();
  } catch (error) {
    console.error("Error ending the call.", error);
  }
});
