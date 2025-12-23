// === STATIC DATA (Allocated once at startup) ===
const LAWS = [
    "Never Outshine the Master", "Never Put Too Much Trust in Friends", "Conceal Your Intentions", 
    "Always Say Less than Necessary", "So Much Depends on Reputation", "Court Attention at all Cost", 
    "Get others to do the work", "Make other people come to you", "Win through your actions", 
    "Avoid the unhappy and unlucky", "Learn to keep people dependent on you", "Use selective honesty",
    "Appeal to self-interest", "Pose as a friend, work as a spy", "Crush your enemy totally", 
    "Use absence to increase respect", "Keep others in suspended terror", "Do not build fortresses",
    "Know who you’re dealing with", "Do not commit to anyone", "Play a sucker to catch a sucker",
    "Use the surrender tactic", "Concentrate your forces", "Play the perfect courtier", "Re-create yourself",
    "Keep your hands clean", "Play on people’s need to believe", "Enter action with boldness",
    "Plan all the way to the end", "Make accomplishments seem effortless", "Control the options",
    "Play to people’s fantasies", "Discover each man’s thumbscrew", "Be royal in your own fashion",
    "Master the art of timing", "Disdain things you cannot have", "Create compelling spectacles",
    "Think as you like but behave like others", "Stir up waters to catch fish", "Despise the free lunch",
    "Avoid stepping into a great man’s shoes", "Strike the shepherd", "Work on the hearts and minds",
    "Disarm with the mirror effect", "Preach change but never reform too much", "Never appear too perfect",
    "Do not go past the mark", "Assume formlessness"
];

module.exports.config = {
    name: "48laws",
    author: "Sethdico (Optimized)",
    version: "1.2",
    category: "Fun",
    description: "Random Law of Power (O(1) memory).",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api }) {
    let num = args[0] ? parseInt(args[0]) : Math.floor(Math.random() * 48) + 1;
    if (isNaN(num) || num < 1 || num > 48) num = Math.floor(Math.random() * 48) + 1;

    // Direct Array Access O(1)
    const msg = `📖 **Law #${num}**\n━━━━━━━━━━━━━━━━\n${LAWS[num-1]}`;
    
    // Fallback to text if buttons fail (common issue on some mobile versions)
    try {
        const buttons = [{ type: "postback", title: "🎲 Another Law", payload: "48laws" }];
        await api.sendButton(msg, buttons, event.sender.id);
    } catch (e) {
        api.sendMessage(msg, event.sender.id);
    }
};
