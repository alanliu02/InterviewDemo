"use client";

import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const baseURL = "http://127.0.0.1:8000";
  const router = useRouter();

  const handleLoadImage = async () => {
    setLoading(true);
    try {
      const listResponse = await fetch(baseURL + "/list_svs");
      const listData = await listResponse.json();
      if (listData.length > 0) {
        const filename = listData[0];
        await fetch(baseURL + `/load_slide/${filename}`);
        setSuccess(true);
      }
    } catch (error) {
      console.error("Error loading image:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToViewer = () => {
    router.push("/viewer");
  };

  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Hello World</h1>
        <Button size="lg" onClick={handleLoadImage} disabled={success || loading}>
          {loading ? "Loading..." : "Load Image"}
        </Button>
        <Button size="lg" onClick={handleNavigateToViewer}>Viewer</Button>
        {success && (
          <div className="alert alert-success">
            Image loaded successfully!
          </div>
        )}
      </div>
    </div>
  );
}
