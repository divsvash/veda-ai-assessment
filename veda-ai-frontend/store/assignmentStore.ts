import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Assignment,
  AssignmentOutput,
  JobProgressUpdate,
  JobStatus,
  QuestionTypeConfig,
} from '@/types';
import { fetchAssignments, deleteAssignment as apiDelete } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Form State ───────────────────────────────────────────────────────────────

export interface AssignmentFormState {
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  dueDate: string;
  timeAllowed: string;
  questionTypes: QuestionTypeConfig[];
  additionalInstructions: string;
  file: File | null;
  errors: Record<string, string>;
}

const defaultForm: AssignmentFormState = {
  title: '',
  subject: '',
  grade: '',
  schoolName: '',
  dueDate: '',
  timeAllowed: '45',
  questionTypes: [
    {
      id: uuidv4(),
      type: 'multiple_choice',
      label: 'Multiple Choice Questions',
      numberOfQuestions: 4,
      marksPerQuestion: 1,
    },
  ],
  additionalInstructions: '',
  file: null,
  errors: {},
};

// ─── Main Store ───────────────────────────────────────────────────────────────

interface AssignmentStore {
  // List
  assignments: Assignment[];
  totalAssignments: number;
  listLoading: boolean;
  listError: string | null;

  // Form
  form: AssignmentFormState;
  isCreating: boolean;

  // Active job tracking
  jobProgress: Map<string, JobProgressUpdate>;

  // Output
  outputs: Map<string, AssignmentOutput>;
  outputLoading: Map<string, boolean>;

  // Modal/drawer state
  showCreateModal: boolean;
  showOutputId: string | null;

  // Actions
  loadAssignments: () => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;

  updateForm: (patch: Partial<AssignmentFormState>) => void;
  addQuestionType: () => void;
  removeQuestionType: (id: string) => void;
  updateQuestionType: (id: string, patch: Partial<QuestionTypeConfig>) => void;
  validateForm: () => boolean;
  resetForm: () => void;

  setJobProgress: (update: JobProgressUpdate) => void;
  setOutput: (assignmentId: string, output: AssignmentOutput) => void;

  setShowCreateModal: (show: boolean) => void;
  setShowOutputId: (id: string | null) => void;
  setIsCreating: (v: boolean) => void;

  // Add new assignment to list after creation
  addAssignment: (a: Assignment) => void;
  updateAssignmentStatus: (id: string, status: JobStatus) => void;
}

export const useAssignmentStore = create<AssignmentStore>()(
  devtools(
    (set, get) => ({
      assignments: [],
      totalAssignments: 0,
      listLoading: false,
      listError: null,
      form: defaultForm,
      isCreating: false,
      jobProgress: new Map(),
      outputs: new Map(),
      outputLoading: new Map(),
      showCreateModal: false,
      showOutputId: null,

      loadAssignments: async () => {
        set({ listLoading: true, listError: null });
        try {
          const data = await fetchAssignments();
          set({
            assignments: data.assignments,
            totalAssignments: data.pagination.total,
            listLoading: false,
          });
        } catch (err) {
          set({ listError: (err as Error).message, listLoading: false });
        }
      },

      deleteAssignment: async (id: string) => {
        try {
          await apiDelete(id);
          set((state) => ({
            assignments: state.assignments.filter((a) => a.id !== id),
            totalAssignments: state.totalAssignments - 1,
          }));
          toast.success('Assignment deleted');
        } catch {
          toast.error('Failed to delete assignment');
        }
      },

      updateForm: (patch) =>
        set((state) => ({ form: { ...state.form, ...patch, errors: "errors" in patch ? (patch as {errors: Record<string,string>}).errors : state.form.errors } })),

      addQuestionType: () =>
        set((state) => ({
          form: {
            ...state.form,
            questionTypes: [
              ...state.form.questionTypes,
              {
                id: uuidv4(),
                type: 'short_answer',
                label: 'Short Answer Questions',
                numberOfQuestions: 3,
                marksPerQuestion: 2,
              },
            ],
          },
        })),

      removeQuestionType: (id) =>
        set((state) => ({
          form: {
            ...state.form,
            questionTypes: state.form.questionTypes.filter((qt) => qt.id !== id),
          },
        })),

      updateQuestionType: (id, patch) =>
        set((state) => ({
          form: {
            ...state.form,
            questionTypes: state.form.questionTypes.map((qt) =>
              qt.id === id ? { ...qt, ...patch } : qt
            ),
          },
        })),

      validateForm: () => {
        const { form } = get();
        const errors: Record<string, string> = {};

        if (!form.title.trim()) errors.title = 'Title is required';
        if (!form.subject.trim()) errors.subject = 'Subject is required';
        if (!form.grade.trim()) errors.grade = 'Grade is required';
        if (!form.schoolName.trim()) errors.schoolName = 'School name is required';

        if (form.questionTypes.length === 0) {
          errors.questionTypes = 'At least one question type is required';
        }

        form.questionTypes.forEach((qt, i) => {
          if (qt.numberOfQuestions < 1) errors[`qt_${i}_count`] = 'Min 1 question';
          if (qt.numberOfQuestions > 50) errors[`qt_${i}_count`] = 'Max 50 questions';
          if (qt.marksPerQuestion < 1) errors[`qt_${i}_marks`] = 'Min 1 mark';
          if (qt.marksPerQuestion > 20) errors[`qt_${i}_marks`] = 'Max 20 marks';
        });

        set((state) => ({ form: { ...state.form, errors } }));
        return Object.keys(errors).length === 0;
      },

      resetForm: () => set({ form: { ...defaultForm, questionTypes: [...defaultForm.questionTypes.map(qt => ({ ...qt, id: uuidv4() }))] } }),

      setJobProgress: (update) =>
        set((state) => {
          const newMap = new Map(state.jobProgress);
          newMap.set(update.assignmentId, update);
          return { jobProgress: newMap };
        }),

      setOutput: (assignmentId, output) =>
        set((state) => {
          const newMap = new Map(state.outputs);
          newMap.set(assignmentId, output);
          return { outputs: newMap };
        }),

      setShowCreateModal: (show) => set({ showCreateModal: show }),
      setShowOutputId: (id) => set({ showOutputId: id }),
      setIsCreating: (v) => set({ isCreating: v }),

      addAssignment: (a) =>
        set((state) => ({
          assignments: [a, ...state.assignments],
          totalAssignments: state.totalAssignments + 1,
        })),

      updateAssignmentStatus: (id, status) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, status, hasOutput: status === 'completed' } : a
          ),
        })),
    }),
    { name: 'assignment-store' }
  )
);
