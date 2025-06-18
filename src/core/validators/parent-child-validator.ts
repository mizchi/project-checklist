import { ParsedTask } from "../markdown-parser.ts";
import { ValidationWarning, ValidatorOptions } from "../../types/validation.ts";

export interface ParentChildValidationResult {
  warnings: ValidationWarning[];
}

interface TaskNode {
  task: ParsedTask;
  children: TaskNode[];
  parent?: TaskNode;
}

export class ParentChildValidator {
  validate(
    tasks: ParsedTask[],
    options: ValidatorOptions = {}
  ): ParentChildValidationResult {
    const warnings: ValidationWarning[] = [];

    // Build task hierarchy
    const taskTree = this.buildTaskTree(tasks);

    // Validate parent-child relationships
    this.validateTaskTree(taskTree, warnings);

    return { warnings };
  }

  private buildTaskTree(tasks: ParsedTask[]): TaskNode[] {
    const nodes: TaskNode[] = tasks.map((task) => ({
      task,
      children: [],
    }));

    const roots: TaskNode[] = [];
    const stack: TaskNode[] = [];

    for (const node of nodes) {
      // Remove nodes from stack that are not potential parents
      while (
        stack.length > 0 &&
        stack[stack.length - 1].task.indent >= node.task.indent
      ) {
        stack.pop();
      }

      if (stack.length === 0) {
        // This is a root node
        roots.push(node);
      } else {
        // This node is a child of the last node in stack
        const parent = stack[stack.length - 1];
        parent.children.push(node);
        node.parent = parent;
      }

      stack.push(node);
    }

    return roots;
  }

  private validateTaskTree(
    nodes: TaskNode[],
    warnings: ValidationWarning[]
  ): void {
    for (const node of nodes) {
      this.validateNode(node, warnings);
      this.validateTaskTree(node.children, warnings);
    }
  }

  private validateNode(node: TaskNode, warnings: ValidationWarning[]): void {
    const task = node.task;

    // Check if parent is incomplete but child is complete
    if (node.parent && !node.parent.task.checked && task.checked) {
      warnings.push({
        type: "PARENT_CHILD_INCONSISTENCY",
        message: `Parent task "${node.parent.task.content}" is incomplete but child task "${task.content}" is completed`,
        line: task.lineNumber,
        severity: "warning",
        parentTask: node.parent.task.content,
        childTask: task.content,
        details: {
          parentLine: node.parent.task.lineNumber,
          parentChecked: node.parent.task.checked,
          childLine: task.lineNumber,
          childChecked: task.checked,
        },
      });
    }

    // Additional validation: Check if all children are complete but parent is not
    if (node.children.length > 0) {
      const allChildrenComplete = node.children.every(
        (child) => child.task.checked
      );
      const someChildrenComplete = node.children.some(
        (child) => child.task.checked
      );

      if (allChildrenComplete && !task.checked) {
        warnings.push({
          type: "PARENT_CHILD_INCONSISTENCY",
          message: `All child tasks are completed but parent task "${task.content}" is not marked as complete`,
          line: task.lineNumber,
          severity: "warning",
          parentTask: task.content,
          details: {
            parentLine: task.lineNumber,
            parentChecked: task.checked,
            completedChildren: node.children.length,
            totalChildren: node.children.length,
          },
        });
      } else if (someChildrenComplete && !task.checked) {
        // This is just informational - some children are done but parent isn't
        // We might want to make this configurable in the future
      }
    }
  }

  // Helper method to get task statistics
  getTaskStatistics(tasks: ParsedTask[]): {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    maxDepth: number;
  } {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.checked).length;
    const pendingTasks = totalTasks - completedTasks;
    const maxDepth =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.indent)) / 2 + 1 : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      maxDepth,
    };
  }
}
