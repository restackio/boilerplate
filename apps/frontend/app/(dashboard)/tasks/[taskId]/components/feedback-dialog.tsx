"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackType: "positive" | "negative";
  onSubmit: (type: "positive" | "negative", text: string) => Promise<void>;
  isSubmitting: boolean;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  feedbackType,
  onSubmit,
  isSubmitting,
}: FeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("");

  const handleSubmit = async () => {
    await onSubmit(feedbackType, feedbackText);
    setFeedbackText(""); // Reset on successful submit
  };

  const handleCancel = () => {
    setFeedbackText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {feedbackType === "positive" ? (
              <ThumbsUp className="h-5 w-5 text-green-600" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-red-600" />
            )}
            {feedbackType === "positive" ? "Positive" : "Negative"} Feedback
          </DialogTitle>
          <DialogDescription>
            {feedbackType === "positive"
              ? "Tell us what you liked about this response."
              : "Tell us what could be improved about this response."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-text">
              Detailed Feedback
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="feedback-text"
              placeholder={
                feedbackType === "positive"
                  ? "What did the agent do well? Be specific..."
                  : "What went wrong? What would you expect instead?"
              }
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

