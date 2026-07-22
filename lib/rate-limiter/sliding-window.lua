-- KEYS[1] = rate_limit_key (e.g., "rl:user:123")
-- ARGV[1] = max_requests
-- ARGV[2] = window_seconds
-- ARGV[3] = current_timestamp (ms)

local key = KEYS[1]
local max = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowStart = now - (window * 1000)

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current entries in window
local count = redis.call('ZCARD', key)

if count < max then
    -- Add new request with timestamp as score
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('EXPIRE', key, window + 1)
    return { 1, max - count - 1 }  -- { allowed, remaining }
else
    return { 0, 0 }  -- { denied, remaining }
end
