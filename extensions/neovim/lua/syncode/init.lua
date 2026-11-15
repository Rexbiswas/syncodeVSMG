-- SYNCODE Neovim Plugin Foundation (Phase 1)
-- Architectural foundation for Lua / RPC integration with SYNCODE Real-Time Services.

local M = {}

M.config = {
  server_url = "http://localhost:4000/api/v1",
  collaboration_url = "ws://localhost:4001",
}

function M.setup(user_config)
  M.config = vim.tbl_deep_extend("force", M.config, user_config or {})
  -- Phase 2: Register nvim_create_user_command and attach buffer change events
end

function M.status()
  return {
    plugin = "syncode.nvim",
    version = "0.1.0",
    connected = false,
  }
end

return M

