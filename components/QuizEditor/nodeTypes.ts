import { CustomNodeType } from "../../types";
import StartNode from "../customNodes/StartNode";
import QuestionNode from "../customNodes/QuestionNode";
import MultipleChoiceNode from "../customNodes/MultipleChoiceNode";
import ResultNode from "../customNodes/ResultNode";
import ConditionNode from "../customNodes/ConditionNode";
import ScoreNode from "../customNodes/ScoreNode";
import VariableNode from "../customNodes/VariableNode";
import FormulaNode from "../customNodes/FormulaNode";
import GoToNode from "../customNodes/GoToNode";
import TimerNode from "../customNodes/TimerNode";
import CollectInfoNode from "../customNodes/CollectInfoNode";
import FeedbackNode from "../customNodes/FeedbackNode";
import TimelineNode from "../customNodes/TimelineNode";
import MatchingNode from "../customNodes/MatchingNode";
import TextInputNode from "../customNodes/TextInputNode";
import InfoNode from "../customNodes/InfoNode";
import AchievementNode from "../customNodes/AchievementNode";
import GroupNode from "../customNodes/GroupNode";
import AllocatorNode from "../customNodes/AllocatorNode";
import ProgressionNode from "../customNodes/ProgressionNode";
import DialogueNode from "../customNodes/DialogueNode";

export const nodeTypes = {
  [CustomNodeType.Start]: StartNode,
  [CustomNodeType.Question]: QuestionNode,
  [CustomNodeType.MultipleChoice]: MultipleChoiceNode,
  [CustomNodeType.Result]: ResultNode,
  [CustomNodeType.Info]: InfoNode,
  [CustomNodeType.Condition]: ConditionNode,
  [CustomNodeType.Score]: ScoreNode,
  [CustomNodeType.Variable]: VariableNode,
  [CustomNodeType.Formula]: FormulaNode,
  [CustomNodeType.GoTo]: GoToNode,
  [CustomNodeType.Timer]: TimerNode,
  [CustomNodeType.CollectInfo]: CollectInfoNode,
  [CustomNodeType.Feedback]: FeedbackNode,
  [CustomNodeType.Timeline]: TimelineNode,
  [CustomNodeType.Matching]: MatchingNode,
  [CustomNodeType.TextInput]: TextInputNode,
  [CustomNodeType.Achievement]: AchievementNode,
  [CustomNodeType.Group]: GroupNode,
  [CustomNodeType.Allocator]: AllocatorNode,
  [CustomNodeType.Progression]: ProgressionNode,
  [CustomNodeType.Dialogue]: DialogueNode,
};
