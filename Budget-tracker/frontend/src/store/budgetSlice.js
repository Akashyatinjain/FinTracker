// src/store/budgetSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";

// ====== Async Thunks ======

export const fetchBudgets = createAsyncThunk(
  "budgets/fetchBudgets",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/api/budgets");
      const data = res.data.budgets || res.data || [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addBudget = createAsyncThunk(
  "budgets/addBudget",
  async (budgetData, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/api/budgets", budgetData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteBudget = createAsyncThunk(
  "budgets/deleteBudget",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/api/budgets/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ====== Slice ======

const budgetSlice = createSlice({
  name: "budgets",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearBudgets: (state) => {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addBudget.fulfilled, (state, action) => {
        const item = action.payload?.budget || action.payload;
        if (item) state.items.unshift(item);
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (b) => String(b.budget_id || b.id) !== String(action.payload)
        );
      });
  },
});

export const { clearBudgets } = budgetSlice.actions;
export default budgetSlice.reducer;
