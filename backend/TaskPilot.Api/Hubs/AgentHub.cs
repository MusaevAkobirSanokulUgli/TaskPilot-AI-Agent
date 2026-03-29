using Microsoft.AspNetCore.SignalR;

namespace TaskPilot.Api.Hubs;

public class AgentHub : Hub
{
    private readonly ILogger<AgentHub> _logger;

    public AgentHub(ILogger<AgentHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = Context.ConnectionId,
            message = "Connected to TaskPilot Agent Hub"
        });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client subscribes to a specific agent session for real-time updates.
    /// </summary>
    public async Task SubscribeToSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"session-{sessionId}");
        await Clients.Caller.SendAsync("SubscribedToSession", sessionId);
    }

    /// <summary>
    /// Client unsubscribes from a session.
    /// </summary>
    public async Task UnsubscribeFromSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session-{sessionId}");
    }

    /// <summary>
    /// Send a message to the agent (for chat interface).
    /// </summary>
    public async Task SendMessage(string message)
    {
        await Clients.All.SendAsync("UserMessage", new
        {
            message,
            sender = Context.ConnectionId,
            timestamp = DateTime.UtcNow
        });
    }
}
