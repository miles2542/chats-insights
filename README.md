# Chats Insights

A privacy-first tool to visualize and analyze your Facebook Messenger data locally.

## What is this?
Chats Insights is a web-based dashboard designed to help you explore your personal Messenger history. It provides detailed analytics on your messaging habits, social circles, and activity patterns without ever compromising your privacy.

## Privacy First
**Your data never leaves your computer.** 
Most analytics tools require you to upload your sensitive chat history to their servers. This tool works differently:
- **100% Local Processing**: All parsing and analysis happen directly in your browser.
- **Zero Server Uploads**: We don't have a backend. Your messages are stored in your browser's local database (IndexedDB).
- **Private by Design**: Once the page is loaded, you could even disconnect from the internet and it would still work.

## Key Features
- **Social Circle Orbit**: Visualize your "social gravity" and see how your inner circle changes over time.
- **Activity Heatmaps**: Identify your peak messaging hours and days.
- **Engagement Metrics**: Track response times, message volume, and conversation starters.
- **Language Patterns**: Explore common words and phrases used across your chats.
- **Call Analytics**: Detailed breakdowns of voice and video call durations and frequency.

## How to Use
1. **Export your data**: Request a download of your Facebook information. Choose the **JSON** format and "All time" for the best results.
2. **Launch the App**: Open the dashboard.
3. **Drop your files**: Drag and drop the `messages/` folder (or specific chat JSONs) into the browser.
4. **Explore**: Wait a few seconds for the local indexing to finish, and start exploring your insights.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Visuals**: Apache ECharts
- **Storage**: IndexedDB (via `idb`)
- **Performance**: Multi-threaded processing using Web Workers
- **Styling**: Tailwind CSS (Bauhaus-inspired aesthetic)
