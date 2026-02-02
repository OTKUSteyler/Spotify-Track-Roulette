import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { FluxDispatcher } from "@vendetta/metro/common";

const messageUtil = findByProps("sendMessage", "editMessage");
const SpotifyStore = findByStoreName("SpotifyStore");

// Initialize storage for track history
if (!storage.trackHistory) {
    storage.trackHistory = [];
}

let lastTrackId = null;

function trackSpotifyActivity() {
    const activity = SpotifyStore?.getActivity();
    
    if (!activity) return;
    
    const trackId = activity.sync_id || activity.session_id;
    const trackName = activity.details;
    const artist = activity.state?.replace("by ", "");
    
    // Only add if it's a new track and has valid data
    if (trackId && trackName && artist && trackId !== lastTrackId) {
        lastTrackId = trackId;
        
        const trackData = {
            id: trackId,
            name: trackName,
            artist: artist,
            url: `https://open.spotify.com/track/${trackId}`,
            timestamp: Date.now()
        };
        
        // Check if track already exists in history
        const exists = storage.trackHistory.some(t => t.id === trackId);
        
        if (!exists) {
            storage.trackHistory.push(trackData);
            
            // Keep only last 200 tracks to avoid too much storage
            if (storage.trackHistory.length > 200) {
                storage.trackHistory.shift();
            }
        }
    }
}

function getRandomTrack() {
    if (!storage.trackHistory || storage.trackHistory.length === 0) {
        return "❌ No tracks in history yet! Play some music on Spotify and try again later.";
    }
    
    const randomTrack = storage.trackHistory[Math.floor(Math.random() * storage.trackHistory.length)];
    
    return randomTrack.url;
}

let unregisterCommand;
let activityInterval;

export default {
    onLoad: () => {
        // Track Spotify activity every 10 seconds
        activityInterval = setInterval(trackSpotifyActivity, 10000);
        
        // Also track immediately
        trackSpotifyActivity();
        
        unregisterCommand = registerCommand({
            name: "spotifyroulette",
            displayName: "Spotify Roulette",
            description: "Sends a random track from your Spotify history",
            options: [],
            execute: async (args, ctx) => {
                const content = getRandomTrack();
                
                messageUtil.sendMessage(
                    ctx.channel.id,
                    { content: content },
                    void 0,
                    { nonce: Date.now().toString() }
                );
            },
            applicationId: "-1",
            inputType: 1,
            type: 1,
        });
    },
    
    onUnload: () => {
        if (unregisterCommand) {
            unregisterCommand();
        }
        if (activityInterval) {
            clearInterval(activityInterval);
        }
    }
};
