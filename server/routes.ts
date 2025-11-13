// PATCH /api/player/active-character
app.patch('/api/player/active-character', requireAuth, async (req, res) => {
  try {
    const { characterId } = req.body;
    const player = req.player;

    console.log(`🎭 [ACTIVE-CHAR] Request to set ${characterId} for player ${player.username}`);

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Update player state with new active character
    const updated = await updatePlayerState(player, {
      selectedCharacterId: characterId,
      activeCharacter: characterId,
      displayImage: null
    });

    console.log(`✅ [ACTIVE-CHAR] Successfully set to ${characterId}`);

    res.json({ 
      success: true, 
      activeCharacter: characterId,
      player: updated,
      message: `Character updated successfully!`
    });
  } catch (err) {
    console.error('❌ [ACTIVE-CHAR] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to set active character' });
  }
});
