import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";

const messageUtil = findByProps("sendMessage", "editMessage");
const SpotifyStore = findByStoreName("SpotifyStore");

function getRandomTrack() {
    if (!SpotifyStore) {
        return "❌ Spotify store not found. Make sure you're connected to Spotify!";
    }

    // Try to get the user's Spotify activity
    const activity = SpotifyStore.getActivity();
    
    if (!activity) {
        return "❌ No Spotify activity found. Make sure you're connected to Spotify and have listened to some tracks!";
    }

    // Get recently played tracks or current track info
    const recentTracks = SpotifyStore.getPlayHistory?.() || [];
    
    if (recentTracks.length === 0) {
        // If no history, use current track
        if (activity.details && activity.state) {
            const trackName = activity.details;
            const artist = activity.state.replace("by ", "");
            return `🎵 **${trackName}** by ${artist}`;
        }
        return "❌ No Spotify tracks found in your history!";
    }

    // Pick a random track from history
    const randomTrack = recentTracks[Math.floor(Math.random() * recentTracks.length)];
    
    if (randomTrack.name && randomTrack.artist) {
        return `🎵 **${randomTrack.name}** by ${randomTrack.artist}`;
    }

    return "❌ Unable to retrieve track information.";
}

let unregisterCommand;

export default {
    onLoad: () => {
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
    }
};
