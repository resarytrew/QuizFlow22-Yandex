import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { useQuizDataStore, buildCurrentQuizData } from "./useQuizDataStore";
import { useCanvasStore } from "./useCanvasStore";
import { useAuthStore } from "./useAuthStore";
import { useAutosaveStore } from "./useAutosaveStore";
import { api } from "../services/apiClient";
import type { Quiz } from "../types";
const data = () => ({
  ...buildCurrentQuizData(),
  description: "Keep me",
  cover_image_url: "https://example.test/image.jpg",
  keywords: ["tag"],
  passport: { projectName: "Passport" } as import("../types").ProjectPassport,
});
beforeEach(() => {
  useQuizDataStore.getState().reset();
  useCanvasStore.getState().reset();
  localStorage.clear();
  const auth = useAuthStore.getState();
  vi.spyOn(useAuthStore, "getState").mockReturnValue({
    ...auth,
    session: { user: { id: "author" } },
  } as ReturnType<typeof useAuthStore.getState>);
});
afterEach(() => vi.restoreAllMocks());
it("manual and automatic saves preserve metadata and share one create operation", async () => {
  useQuizDataStore.setState({ quizDataBase: data() });
  const create = vi
    .spyOn(api, "createQuiz")
    .mockImplementation(
      async (payload) =>
        ({
          id: "new",
          name: "New",
          user_id: "author",
          created_at: "",
          updated_at: "",
          visibility: "private",
          is_favorite: false,
          revision: 1,
          quiz_data: payload.quiz_data!,
        }) as Awaited<ReturnType<typeof api.createQuiz>>,
    );
  const update = vi
    .spyOn(api, "updateQuiz")
    .mockImplementation(
      async (id, payload) =>
        ({
          id,
          name: "New",
          user_id: "author",
          created_at: "",
          updated_at: "",
          visibility: "private",
          is_favorite: false,
          revision: 2,
          quiz_data: payload.quiz_data!,
        }) as Awaited<ReturnType<typeof api.updateQuiz>>,
    );
  await Promise.all([
    useQuizDataStore.getState().autosaveQuiz(),
    useQuizDataStore.getState().saveQuiz(),
  ]);
  expect(create).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledTimes(1);
  expect(update.mock.calls[0][1]).toMatchObject({
    expected_revision: 1,
    quiz_data: { description: "Keep me", keywords: ["tag"] },
  });
});
it("does not report a server failure as saved and stops conflict retries", async () => {
  useQuizDataStore
    .getState()
    .loadQuiz({
      id: "q",
      name: "Q",
      quiz_data: data(),
      revision: 3,
    } as unknown as Quiz);
  const update = vi
    .spyOn(api, "updateQuiz")
    .mockRejectedValue(new Error("revision_conflict"));
  await useQuizDataStore.getState().autosaveQuiz();
  expect(useQuizDataStore.getState().saveStatus).toBe("conflict");
  await useQuizDataStore.getState().autosaveQuiz();
  expect(update).toHaveBeenCalledTimes(1);
});
it("keeps backups separate per quiz, retains old checkpoints and reports quota errors", () => {
  useQuizDataStore.setState({
    currentQuizId: "one",
    currentQuizName: "One",
    quizDataBase: data(),
  });
  useAutosaveStore.getState().autosaveCurrentQuiz();
  useQuizDataStore.setState({ currentQuizId: "two", currentQuizName: "Two" });
  useAutosaveStore.getState().autosaveCurrentQuiz();
  useQuizDataStore.setState({ currentQuizId: "one" });
  useAutosaveStore.getState().checkForAutosave();
  expect(useAutosaveStore.getState().versions[0].currentQuizName).toBe("One");
  const key = "potok_backups_v2:author:one";
  const backups = JSON.parse(localStorage.getItem(key)!);
  backups[0].timestamp = "2020-01-01T00:00:00Z";
  localStorage.setItem(key, JSON.stringify(backups));
  useAutosaveStore.getState().checkForAutosave();
  expect(useAutosaveStore.getState().versions).toHaveLength(1);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  useAutosaveStore.getState().autosaveCurrentQuiz();
  expect(useAutosaveStore.getState().storageError).toContain("не записана");
});
