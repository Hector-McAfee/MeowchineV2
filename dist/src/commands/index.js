import * as bingo_create from "./setup/bingo_create.js";
import * as set_channels from "./setup/set_channels.js";
import * as board from "./board/add_remove_set.js";
import * as check from "./player/check.js";
import * as check_team from "./player/check_team.js";
import * as check_stats from "./player/check_stats.js";
import * as submit_drop from "./player/submit_drop.js";
import * as chest_verify from "./player/chest_verify.js";
import * as check_verify from "./player/check_verify.js";
import * as start_bingo from "./setup/start_bingo.js";
import * as open_verification from "./setup/open_verification.js";
import * as end_bingo from "./setup/end_bingo.js";
import * as manual_chest_verify from "./setup/manual_chest_verify.js";
import * as list_pending_drops from "./setup/list_pending_drops.js";
export const minimal = [
    bingo_create.data.toJSON()
];
export const full = [
    bingo_create.data.toJSON(),
    set_channels.set_output.toJSON(),
    set_channels.set_announcments.toJSON(),
    set_channels.set_input.toJSON(),
    board.add_boss.toJSON(),
    board.add_drop.toJSON(),
    board.remove_boss.toJSON(),
    board.remove_drop.toJSON(),
    board.set_teams_drop.toJSON(),
    check.data.toJSON(),
    check_team.data.toJSON(),
    submit_drop.data.toJSON(),
    chest_verify.data.toJSON(),
    check_verify.data.toJSON(),
    check_stats.data.toJSON(),
    start_bingo.data.toJSON(),
    open_verification.data.toJSON(),
    manual_chest_verify.data.toJSON(),
    list_pending_drops.data.toJSON(),
    end_bingo.data.toJSON()
];
export const handlers = {
    bingo_create: bingo_create.execute,
    set_output: set_channels.exec_set_output,
    set_announcments: set_channels.exec_set_announcments,
    set_input: set_channels.exec_set_input,
    add_boss: board.exec_add_boss,
    add_drop: board.exec_add_drop,
    remove_boss: board.exec_remove_boss,
    remove_drop: board.exec_remove_drop,
    set_teams_drop: board.exec_set_teams_drop,
    check: check.execute,
    check_team: check_team.execute,
    submit_drop: submit_drop.execute,
    chest_verify: chest_verify.execute,
    check_verify: check_verify.execute,
    check_stats: check_stats.execute,
    start_bingo: start_bingo.execute,
    open_verification: open_verification.execute,
    manual_chest_verify: manual_chest_verify.execute,
    list_pending_drops: list_pending_drops.execute,
    end_bingo: end_bingo.execute
};
