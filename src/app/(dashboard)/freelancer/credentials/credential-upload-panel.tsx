"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../../../components/ui/button";
import { TextInput } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";

type CredentialDraft = {
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string[];
  confidenceScore: number;
  extractedText: string;
  flags: string[];
  issueDate: string;
  issuer: string;
  skills: string[];
  summary: string;
  title: string;
  type: string;
  userDecision: "approved" | "edited";
};

type CredentialUploadPanelProps = {
  disabled?: boolean;
};

export function CredentialUploadPanel({ disabled = false }: CredentialUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<CredentialDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isBusy = isAnalyzing || isSaving || isRefreshing;

  async function runAnalysis(file: File) {
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/credentials/analyze", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          analysis?: {
            confidence_level?: "high" | "medium" | "low";
            confidence_reason?: string[];
            confidence_score?: number;
            flags?: string[];
            issue_date?: string | null;
            issuer?: string | null;
            summary?: string;
            title?: string;
          };
          error?: string;
          success?: boolean;
        }
      | null;

    if (!response.ok || !payload?.success || !payload.analysis) {
      throw new Error(payload?.error || "Unable to analyze the credential.");
    }

    return payload.analysis;
  }

  async function handleSelectedFile(file: File) {
    if (disabled || isBusy) {
      return;
    }

    setSelectedFile(file);
    setDraft(null);
    setError(null);
    setSuccessMessage(null);
    setIsAnalyzing(true);

    try {
      const analysis = await runAnalysis(file);

      setDraft({
        title: analysis.title?.trim() || "Credential",
        issuer: analysis.issuer?.trim() || "",
        issueDate: analysis.issue_date?.trim() || "",
        type: "",
        skills: [],
        summary: analysis.summary?.trim() || "",
        confidenceScore:
          typeof analysis.confidence_score === "number"
            ? analysis.confidence_score
            : 0,
        confidenceLevel:
          analysis.confidence_level === "high" ||
          analysis.confidence_level === "medium" ||
          analysis.confidence_level === "low"
            ? analysis.confidence_level
            : "low",
        confidenceReason: Array.isArray(analysis.confidence_reason)
          ? analysis.confidence_reason
          : [],
        flags: Array.isArray(analysis.flags) ? analysis.flags : [],
        extractedText: "",
        userDecision: "approved",
      });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Unable to analyze the file.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!selectedFile || !draft || disabled || isBusy) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("title", draft.title);
      formData.set("issuer", draft.issuer);
      formData.set("issue_date", draft.issueDate);
      formData.set("type", draft.type);
      formData.set("summary", draft.summary);
      formData.set("confidence_score", String(draft.confidenceScore));
      formData.set("confidence_level", draft.confidenceLevel);
      formData.set("extracted_text", draft.extractedText);
      formData.set("user_decision", "approved");
      for (const skill of draft.skills) {
        formData.append("skills", skill);
      }
      for (const reason of draft.confidenceReason) {
        formData.append("confidence_reason", reason);
      }
      for (const flag of draft.flags) {
        formData.append("flags", flag);
      }

      const response = await fetch("/api/credentials/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            success?: boolean;
          }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to save the credential.");
      }

      setSuccessMessage(
        "✅ Credential added to your profile\nThis strengthens your credibility and improves your matching potential",
      );
      setDraft(null);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the credential.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRetryAnalysis() {
    if (!selectedFile || disabled || isBusy) {
      return;
    }

    await handleSelectedFile(selectedFile);
  }

  function handleInputChange<K extends keyof CredentialDraft>(key: K, value: CredentialDraft[K]) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        [key]: value,
        userDecision: currentDraft.userDecision,
      };
    });
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleSelectedFile(file);
    }
  }

  function handleFilePickerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void handleSelectedFile(file);
    }
  }

  function resetSelection() {
    if (isBusy) {
      return;
    }

    setDraft(null);
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDiscard() {
    if (isBusy) {
      return;
    }

    await deleteTempFileIfExists();
    resetSelection();
  }

  const confidenceTone = draft?.confidenceLevel ?? getConfidenceTone(draft?.confidenceScore ?? 0);

  return (
    <div className="credential-uploader">
      <label
        className={[
          "credential-dropzone",
          isDragging ? "credential-dropzone--active" : "",
          disabled ? "credential-dropzone--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        htmlFor="credential-upload-input"
        onDragEnter={() => !disabled && setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          accept="application/pdf,image/*"
          className="credential-dropzone__input"
          disabled={disabled || isBusy}
          id="credential-upload-input"
          onChange={handleFilePickerChange}
          type="file"
        />
        <div className="credential-dropzone__glow" />
        <div className="credential-dropzone__content">
          <div className="credential-dropzone__eyebrow">Secure document analysis</div>
          <div className="credential-dropzone__title">Drop a PDF or image to extract credential details</div>
          <p className="credential-dropzone__copy">
            AI will read the document, suggest the metadata, and let you confirm everything before it is saved.
          </p>
          <div className="credential-dropzone__actions">
            <span className="credential-dropzone__button">Choose file</span>
            <span className="credential-dropzone__hint">PDF, JPG, PNG, WEBP up to 10 MB</span>
          </div>
          {selectedFile ? (
            <div className="credential-dropzone__file">
              <strong>{selectedFile.name}</strong>
              <span>{formatFileSize(selectedFile.size)}</span>
            </div>
          ) : null}
        </div>
      </label>

      {isAnalyzing ? (
        <div className="credential-uploader__status credential-uploader__status--loading">
          <span className="credential-uploader__pulse" />
          Analyzing document...
        </div>
      ) : null}

      {error ? <p className="auth-shell__message auth-shell__message--error">{error}</p> : null}
      {successMessage ? <p className="notice">{successMessage}</p> : null}

      {draft ? (
        <div className="credential-review surface">
          <div className="credential-review__header">
            <div>
              <span className="credential-review__eyebrow">Extracted info</span>
              <h3 className="credential-review__title">Review before saving</h3>
            </div>
            <div className="credential-confidence-block">
              <span
                className={[
                  "credential-confidence",
                  `credential-confidence--${confidenceTone}`,
                ].join(" ")}
              >
                AI Assessment
              </span>
              <span className="credential-confidence-block__copy">
                Confidence: {formatConfidenceLabel(draft.confidenceLevel)}
              </span>
              <span className="credential-confidence-block__score">
                {formatConfidence(draft.confidenceScore)}
              </span>
              <span className="credential-confidence-block__trust">
                AI-validated (not externally verified)
              </span>
            </div>
          </div>

          {draft.confidenceLevel === "low" ? (
            <p className="credential-review__warning">
              ⚠ This document may be unclear or incomplete. You can still add it or retry.
            </p>
          ) : null}

          <div className="credential-review__grid">
            <TextInput
              disabled={isBusy}
              id="credential-review-title"
              label="Title"
              onChange={(event) => handleInputChange("title", event.target.value)}
              placeholder="Executive MBA"
              value={draft.title}
            />
            <TextInput
              disabled={isBusy}
              id="credential-review-issuer"
              label="Issuer"
              onChange={(event) => handleInputChange("issuer", event.target.value)}
              placeholder="INSEAD"
              value={draft.issuer}
            />
            <TextInput
              disabled={isBusy}
              id="credential-review-date"
              label="Date"
              onChange={(event) => handleInputChange("issueDate", event.target.value)}
              placeholder="2024-06-10"
              value={draft.issueDate}
            />
            <div className="credential-review__trust">
              <span className="field__label">Trust indicator</span>
              <div className="credential-trust-card">
                <strong>{formatConfidenceLabel(draft.confidenceLevel)}</strong>
                <span>{getConfidenceLabel(draft.confidenceScore)}</span>
              </div>
            </div>
          </div>

          <Textarea
            disabled={isBusy}
            id="credential-review-summary"
            label="Summary"
            onChange={(event) => handleInputChange("summary", event.target.value)}
            placeholder="Summarize what this credential confirms."
            value={draft.summary}
          />

          {draft.confidenceReason.length > 0 ? (
            <div className="credential-review__notes">
              <span className="field__label">Confidence reasons</span>
              <ul className="credential-review__list credential-review__list--checks">
                {draft.confidenceReason.map((reason) => (
                  <li key={reason}>
                    <span className="credential-review__check">✔</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.flags.length > 0 ? (
            <div className="credential-review__notes">
              <span className="field__label">Flags</span>
              <ul className="credential-review__list credential-review__list--flags">
                {draft.flags.map((flag) => (
                  <li key={flag}>
                    <span className="credential-review__flag">⚠</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.extractedText ? (
            <details className="credential-review__details">
              <summary>View extracted text</summary>
              <pre className="credential-review__extracted-text">{draft.extractedText}</pre>
            </details>
          ) : null}

          <div className="credential-review__actions">
            <Button disabled={isBusy || !draft.title || !draft.summary} onClick={() => void handleSave()}>
              {isSaving ? "Adding to profile..." : "Add to Profile"}
            </Button>
            <Button disabled={isBusy} onClick={() => void handleDiscard()} variant="secondary">
              Discard
            </Button>
            <Button disabled={isBusy} onClick={() => void handleRetryAnalysis()} variant="ghost">
              Retry Analysis
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatConfidence(score: number) {
  return `${Math.round(score)}%`;
}

function formatConfidenceLabel(level: "high" | "medium" | "low") {
  if (level === "high") {
    return "High";
  }

  if (level === "medium") {
    return "Medium";
  }

  return "Low";
}

function getConfidenceTone(score: number) {
  if (score > 75) {
    return "high";
  }

  if (score >= 50) {
    return "medium";
  }

  return "low";
}

function getConfidenceLabel(score: number) {
  if (score > 75) {
    return "Strong match to the document";
  }

  if (score >= 50) {
    return "Good, but worth a quick review";
  }

  return "Needs closer confirmation";
}

async function deleteTempFileIfExists() {
  return;
}
