"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fspath = require("path");
class FileName {
    constructor(path, root) {
        this.name = path;
        this.path = fspath.normalize(fspath.isAbsolute(path) ? path : fspath.join(root || process.cwd(), path));
        this.basePath = root;
    }
    toString() {
        if (this.basePath) {
            return fspath.relative(this.basePath, this.path);
        }
        return `.../${this.name}`;
    }
}
exports.FileName = FileName;
class LogicalName {
    constructor(name) {
        this.name = name;
    }
    toString() {
        return `${this.name}`;
    }
}
exports.LogicalName = LogicalName;
class Task {
    static file(path, root, state) {
        return new Task(new FileName(path, root), state);
    }
    static logical(name, state) {
        return new Task(new LogicalName(name), state);
    }
    constructor(name, state) {
        this.name = name;
        this.state = state || {};
    }
    updateState(state) {
        return new Task(this.name, state || {});
    }
}
exports.Task = Task;
class Executors {
    static combine(firstOrMany, second) {
        if (Array.isArray(firstOrMany)) {
            return firstOrMany.reduce((a, b) => Executors.combine(a, b));
        }
        else if (!second) {
            throw new TypeError('invalid usage');
        }
        else {
            const first = firstOrMany;
            return async (task, context) => {
                const next = await first(task, context);
                const result = await second(next || task, context);
                return result || next || task;
            };
        }
    }
}
exports.Executors = Executors;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90YXNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBUS9CLE1BQWEsUUFBUTtJQUluQixZQUFhLElBQVksRUFBRSxJQUFhO1FBQ3RDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxRQUFRO1FBQ04sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUNqRDtRQUNELE9BQU8sT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNGO0FBZkQsNEJBZUM7QUFFRCxNQUFhLFdBQVc7SUFFdEIsWUFBYSxJQUFZO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFDRCxRQUFRO1FBQ04sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0Y7QUFSRCxrQ0FRQztBQUVELE1BQWEsSUFBSTtJQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBWSxFQUFFLElBQWEsRUFBRSxLQUFXO1FBQ2xELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQVksRUFBRSxLQUFXO1FBQ3RDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUdELFlBQVksSUFBYyxFQUFFLEtBQVc7UUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFDRCxXQUFXLENBQUMsS0FBVTtRQUNwQixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRjtBQWhCRCxvQkFnQkM7QUFpQkQsTUFBYSxTQUFTO0lBR3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBa0MsRUFBRSxNQUFpQjtRQUNsRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5RDthQUFNLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDbEIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUN0QzthQUFNO1lBQ0wsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDO1lBQzFCLE9BQU8sS0FBSyxFQUFFLElBQVUsRUFBRSxPQUFnQixFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbkQsT0FBTyxNQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQztZQUNoQyxDQUFDLENBQUM7U0FDSDtJQUNILENBQUM7Q0FDRjtBQWpCRCw4QkFpQkMifQ==