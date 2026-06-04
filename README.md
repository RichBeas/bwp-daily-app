# BWP Daily Devotion App

A local React app for the Alpha Bible daily devotion and relevance to running BWP Group.

## Run locally for iPhone

1. Unzip this folder.
2. Open Terminal in the `bwp-devotion-app` folder.
3. Run:

```bash
npm install
npm run phone
```

Vite will print addresses. Use the one under **Network**, for example:

```text
http://192.168.1.23:5173
```

Open that exact Network URL in Safari on your iPhone while your iPhone is on the same Wi-Fi as your computer.

## Add to iPhone Home Screen

In Safari on iPhone: Share button -> Add to Home Screen -> Add.

## If the page does not open

- Do not use `localhost` or `127.0.0.1` on the iPhone. Those point to the iPhone itself, not your computer.
- Make sure the iPhone and computer are on the same Wi-Fi network.
- Keep Terminal running while you open the page.
- Allow incoming connections if macOS/Windows Firewall asks.
- Try the computer's current local IP address again; it can change.

## Notes

The app is local. It only works on the iPhone while the computer running Vite is awake and on the same network.
