"use client";

import { useState } from "react";
import { useSiteContext } from "@/context/site-context";
import type { CrawlPageResult, PageAnalysis, Recommendation } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  Cpu,
  FileText,
  Lightbulb,
  ArrowUp,
} from "lucide-react";

export function AnalysisPanel({ page }: { page: CrawlPageResult }) {
  const { getAnalysis, setAnalysis } = useSiteContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cached = getAnalysis(page.url);

  // Always show deterministic SEO score (no API needed)
  const seoScore = scoreSeo({ url: page.url, title: page.title, seo: page.seo });

  async function runAnalysis() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: page.url,
          title: page.title,
          bodyText: page.bodyText,
          seo: page.seo,
          outgoingLinks: page.outgoingLinks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const analysis: PageAnalysis = await res.json();
      setAnalysis(page.url, analysis);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor =
    seoScore.score >= 80
      ? "text-emerald-500"
      : seoScore.score >= 50
        ? "text-amber-500"
        : "text-red-500";

  const severityIcon = {
    error: <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
    info: <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />,
  };

  return (
    <div className="space-y-6">
      {/* Deterministic SEO Score (always shown) */}
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold font-mono ${scoreColor}`}>
          {seoScore.score}
        </div>
        <div>
          <div className="text-sm font-medium">SEO Score</div>
          <div className="text-xs text-muted-foreground">
            {seoScore.summary}
          </div>
        </div>
      </div>

      {/* SEO Issues from scorer */}
      {seoScore.issues.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">SEO Issues</h3>
          <div className="space-y-2">
            {seoScore.issues.map((issue, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  {severityIcon[issue.severity]}
                  <span className="text-sm font-medium">{issue.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${
                      issue.severity === "error"
                        ? "text-red-500 border-red-500/30"
                        : issue.severity === "warning"
                          ? "text-amber-500 border-amber-500/30"
                          : "text-blue-400 border-blue-400/30"
                    }`}
                  >
                    {issue.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    -{issue.pointsDeducted}pts
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checks passed */}
      {seoScore.checksPassed.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Passed: {seoScore.checksPassed.join(", ")}
        </div>
      )}

      {/* LLM Analysis section */}
      {!cached ? (
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center space-y-3">
          <Sparkles className="h-6 w-6 text-muted-foreground/50" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">AI-Powered Deep Analysis</p>
            <p className="text-xs text-muted-foreground">
              Get content analysis, feature detection, and strategic recommendations
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive max-w-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button onClick={runAnalysis} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      ) : (
        <LlmResults analysis={cached} />
      )}
    </div>
  );
}

function LlmResults({ analysis }: { analysis: PageAnalysis }) {
  const priorityColors = {
    high: "text-red-500 border-red-500/30",
    medium: "text-amber-500 border-amber-500/30",
    low: "text-blue-400 border-blue-400/30",
  };

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </h3>
          <div className="space-y-2">
            {analysis.recommendations.map((rec: Recommendation, i: number) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <ArrowUp className={`h-3.5 w-3.5 shrink-0 ${
                    rec.priority === "high" ? "text-red-500" :
                    rec.priority === "medium" ? "text-amber-500" : "text-blue-400"
                  }`} />
                  <span className="text-sm font-medium">{rec.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${priorityColors[rec.priority]}`}
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Analysis */}
      {analysis.contentAnalysis && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content Analysis
          </h3>
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <p className="text-sm">{analysis.contentAnalysis.summary}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Readability:</span>
              <span className="text-sm font-mono">
                {analysis.contentAnalysis.readabilityScore}/100
              </span>
            </div>
            {analysis.contentAnalysis.keyTopics.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Key Topics
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.contentAnalysis.keyTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {analysis.contentAnalysis.contentGaps.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Content Gaps
                </span>
                <ul className="text-xs space-y-0.5 text-amber-400">
                  {analysis.contentAnalysis.contentGaps.map((gap, i) => (
                    <li key={i}>- {gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Detection */}
      {analysis.features && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Detected Features & Technologies
          </h3>
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            {analysis.features.detected.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Features
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.features.detected.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {analysis.features.technologies.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Technologies
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.features.technologies.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
