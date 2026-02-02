import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";

const messageUtil = findByProps("sendMessage", "editMessage");
const SpotifyStore = findByStoreName("SpotifyStore");

// Initialize storage for track history
if (!storage.trackHistory) {
    storage.trackHistory = [];
}

let lastTrackId = null;
let unsubscribe = null;

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
    
    // Get current playing track ID to avoid selecting it
    const currentActivity = SpotifyStore?.getActivity();
    const currentTrackId = currentActivity?.sync_id || currentActivity?.session_id;
    
    // Filter out the currently playing track if we have more than one track
    let availableTracks = storage.trackHistory;
    if (storage.trackHistory.length > 1 && currentTrackId) {
        availableTracks = storage.trackHistory.filter(t => t.id !== currentTrackId);
    }
    
    // If we filtered everything out (only had 1 track and it's playing), use all tracks
    if (availableTracks.length === 0) {
        availableTracks = storage.trackHistory;
    }
    
    const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
    
    return randomTrack.url;
}

let unregisterCommand;

export default {
    onLoad: () => {
        // Subscribe to Spotify store updates instead of using interval
        unsubscribe = SpotifyStore?.addChangeListener?.(trackSpotifyActivity);
        
        // Track immediately on load
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
        if (unsubscribe) {
            unsubscribe();
        }
    }
};
