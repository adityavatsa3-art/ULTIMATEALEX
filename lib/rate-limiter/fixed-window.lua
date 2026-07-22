-- Fixed Window Rate Limiter
-- KEYS[1] = key, ARGV[1] = max, ARGV[2] = window_seconds, ARGV[3] = now_ms

local key = KEYS[1]
local max = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end

if count <= max then
    return { 1, max - count }
else
    return { 0, 0 }
end
