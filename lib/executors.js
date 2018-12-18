"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chain_1 = require("./chain");
const fs = require("fs");
const fileStat = (path) => new Promise((resolve, reject) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));
const isFile = (task) => {
    const taskName = task.name;
    if (taskName instanceof chain_1.FileName) {
        return taskName.path;
    }
};
function preloadContents(pathSelector) {
    return async (task, context) => {
        const path = await pathSelector(task);
        if (path) {
            const contents = task.state.contents || await context.getContents(task);
            return task.updateState({
                ...task.state,
                contents
            });
        }
    };
}
exports.preloadContents = preloadContents;
function saveContents(pathSelector) {
    return async (task, context) => {
        const path = await pathSelector(task);
        if (path) {
            const data = await context.getContents(task);
            await context.saveContents(task, data, true); //writeFile(path, data);
        }
        return;
    };
}
exports.saveContents = saveContents;
function storeMtime(pathSelector) {
    return async (task, context) => {
        const select = pathSelector || isFile;
        const path = await select(task);
        if (path) {
            const mtime = await fileStat(path).then(stats => stats.mtime, () => null);
            if (mtime) {
                await context.storage.setObject(`!mime!${path}`, mtime);
            }
        }
        return;
    };
}
exports.storeMtime = storeMtime;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4ZWN1dG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUE0RDtBQUM1RCx5QkFBeUI7QUFFekIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQXFCLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFNMUosTUFBTSxNQUFNLEdBQWlCLENBQUMsSUFBVSxFQUFFLEVBQUU7SUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMzQixJQUFJLFFBQVEsWUFBWSxnQkFBUSxFQUFFO1FBQ2hDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztLQUN0QjtBQUNILENBQUMsQ0FBQTtBQUVELFNBQWdCLGVBQWUsQ0FBQyxZQUEwQjtJQUN4RCxPQUFPLEtBQUssRUFBRSxJQUFVLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO1FBQzVDLE1BQU0sSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksSUFBSSxFQUFFO1lBQ1IsTUFBTSxRQUFRLEdBQVksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFTLElBQUksTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDdEIsR0FBRyxJQUFJLENBQUMsS0FBSztnQkFDYixRQUFRO2FBQ1QsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBWEQsMENBV0M7QUFFRCxTQUFnQixZQUFZLENBQUMsWUFBMEI7SUFDckQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLE9BQWdCLEVBQXNCLEVBQUU7UUFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxJQUFJLEVBQUU7WUFDUixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7U0FDdkU7UUFDRCxPQUFPO0lBQ1QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQVRELG9DQVNDO0FBRUQsU0FBZ0IsVUFBVSxDQUFDLFlBQTJCO0lBQ3BELE9BQU8sS0FBSyxFQUFFLElBQVUsRUFBRSxPQUFnQixFQUFzQixFQUFFO1FBQ2hFLE1BQU0sTUFBTSxHQUFHLFlBQVksSUFBSSxNQUFNLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxJQUFJLEVBQUU7WUFDUixNQUFNLEtBQUssR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN6RDtTQUNGO1FBQ0QsT0FBTztJQUNULENBQUMsQ0FBQTtBQUNILENBQUM7QUFaRCxnQ0FZQyJ9