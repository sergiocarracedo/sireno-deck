---
files_modified:
  - config.yml
autonomous: true
single_layer_justified: true
objective: "The repo example config demonstrates Phase 3 tap behavior by including at least one action button and one change-deck button that can be exercised during manual UAT."
---

# Quick Task 001: Make Example Config Demoable For Taps

<objective>
Update the repo's example `config.yml` so manual UAT can exercise the features we just built instead of only display buttons. Keep it narrow: no runtime changes, just a config that proves action-button tapping and deck navigation are actually wired.
</objective>

## Tasks

<task id="001-01">
<title>Add action and navigation examples to config.yml</title>
<files>
- config.yml
</files>
<action>
Update the root `config.yml` so the main deck includes at least one `action` button with a safe demo command and one `change-deck` button pointing to a declared sub-deck. Add a sub-deck definition with at least one visible button so the generated back button can be tested on hardware. Keep the existing display examples unless they conflict with reserved navigation behavior.
</action>
<verify>
grep -n "type: action\|type: change-deck\|target_deck\|apps:" config.yml
</verify>
<done>
The example config can now be used to test both action-button taps and deck navigation during manual UAT.
</done>
</task>
