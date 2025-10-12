"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { FeedbackDialog } from "./feedback-dialog";
import { submitFeedback } from "@/app/actions/feedback";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { ConversationItem } from "../types";

interface FeedbackButtonsProps {
  item: ConversationItem;
  taskId: string;
  agentId: string;
  workspaceId: string;
  responseIndex: number;
  messageCount: number;
}

export function FeedbackButtons({
  item,
  taskId,
  agentId,
  workspaceId,
  responseIndex,
  messageCount,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogFeedbackType, setDialogFeedbackType] = useState<"positive" | "negative">("negative");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const responseId = item.openai_output?.id || item.id;

  const handleQuickFeedback = async (type: "positive" | "negative") => {
    if (feedback === type) {
      // Already submitted this feedback
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        taskId,
        agentId,
        workspaceId,
        responseId,
        responseIndex,
        messageCount,
        feedbackType: type,
      });

      setFeedback(type);
      toast({
        title: "Feedback submitted",
        description: `Thank you for your ${type} feedback!`,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedFeedback = (type: "positive" | "negative") => {
    setDialogFeedbackType(type);
    setShowDialog(true);
  };

  const handleSubmitDetailedFeedback = async (
    type: "positive" | "negative",
    text: string
  ) => {
    setIsSubmitting(true);
    try {
      await submitFeedback({
        taskId,
        agentId,
        workspaceId,
        responseId,
        responseIndex,
        messageCount,
        feedbackType: type,
        feedbackText: text,
      });

      setFeedback(type);
      setShowDialog(false);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your detailed feedback!",
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2">
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 px-2 gap-1",
            feedback === "positive" && "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          )}
          onClick={() => handleQuickFeedback("positive")}
          disabled={isSubmitting || feedback !== null}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 px-2 gap-1",
            feedback === "negative" && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
          )}
          onClick={() => handleDetailedFeedback("negative")}
          disabled={isSubmitting || feedback !== null}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      <FeedbackDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        feedbackType={dialogFeedbackType}
        onSubmit={handleSubmitDetailedFeedback}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

