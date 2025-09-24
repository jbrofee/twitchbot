# Changing scope

- Update RefreshingAuthProvider in index.ts
- Run twitch token -u -s "chat:read chat:edit..." with Twitch CLI to generate new tokens
- Replace tokens in file

For easy copying

```
twitch token -u -s "channel:manage:ads channel:manage:redemptions channel:read:ads channel:read:redemptions channel:read:vips chat:edit chat:read moderator:manage:banned_users moderator:manage:shoutouts moderator:read:banned_users channel:edit:commercial"
```

# TTS

https://github.com/remsky/Kokoro-FastAPI?tab=readme-ov-file

CPU inference
Go to docker/cpu and run docker compose up
