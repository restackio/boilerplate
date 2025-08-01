async function debugScheduleAgent() {
  try {
    // Dynamic import to work with ES modules
    const Restack = (await import("@restackio/ai")).default;
    
    const connectionOptions = {
      engineId: process.env.RESTACK_ENGINE_ID,
      address: process.env.RESTACK_ENGINE_ADDRESS,
      apiKey: process.env.RESTACK_ENGINE_API_KEY,
    };
    
    const client = new Restack(connectionOptions);

    console.log("Starting debug of scheduleAgent...");
    
    // Test parameters with random ID
    const agentId = `test-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const taskDescription = "This is a test task for debugging";
    
    const event = {
      name: "messages",
      input: {
        messages: [{ role: "user", content: taskDescription }],
      },
    };

    console.log("Event object:", JSON.stringify(event, null, 2));
    console.log("Using agentId:", agentId);

    console.log("Calling scheduleAgent...", event);
    const runId = await client.scheduleAgent({
      agentName: "AgentTask",
      agentId: agentId,
      input: {
        title: "Test Task",
        description: taskDescription,
        status: "pending",
        agent_id: "021f1ade-9c1a-4713-ae45-58e1757592ca",
        assigned_to_id: "123",
      },
      event,
    });

    console.log("✅ Success! Run ID:", runId);
    return runId;
  } catch (error) {
    console.error("❌ Error in scheduleAgent:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Run the debug function
debugScheduleAgent()
  .then((runId) => {
    console.log("Debug completed successfully with runId:", runId);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Debug failed:", error);
    process.exit(1);
  }); 