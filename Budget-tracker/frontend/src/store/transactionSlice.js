// src/store/transactionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";

// ====== Async Thunks ======

export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/api/transactions");
      const data = res.data.transactions || res.data || [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addTransaction = createAsyncThunk(
  "transactions/addTransaction",
  async (transactionData, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/api/transactions", transactionData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateTransaction = createAsyncThunk(
  "transactions/updateTransaction",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiClient.put(`/api/transactions/${id}`, data);
      return { id, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  "transactions/deleteTransaction",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/api/transactions/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);export const deleteMultipleTransactions = createAsyncThunk(
  "transactions/deleteMultipleTransactions",
  async (ids, { rejectWithValue }) => {
    try {
      await apiClient.post("/api/transactions/delete-multiple", { ids });
      return ids;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteAllTransactions = createAsyncThunk(
  "transactions/deleteAllTransactions",
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.delete("/api/transactions/all");
      return;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const importTransactions = createAsyncThunk(
  "transactions/importTransactions",
  async (rows, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/api/transactions/import", { rows });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ====== Slice ======

const transactionSlice = createSlice({
  name: "transactions",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearTransactions: (state) => {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTransactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addTransaction
      .addCase(addTransaction.fulfilled, (state, action) => {
        const item = action.payload?.transaction || action.payload;
        if (item && item.amount) {
          state.items.unshift(item);
        }
      })
      // updateTransaction
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const updatedItem = action.payload?.data?.transaction || action.payload?.data;
        const targetId = action.payload?.id;
        const idx = state.items.findIndex(
          (t) => String(t.transaction_id || t.id) === String(targetId)
        );
        if (idx !== -1 && updatedItem) {
          state.items[idx] = { ...state.items[idx], ...updatedItem };
        }
      })
      // deleteTransaction
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (t) => String(t.transaction_id || t.id) !== String(action.payload)
        );
      })
      // deleteMultipleTransactions
      .addCase(deleteMultipleTransactions.fulfilled, (state, action) => {
        const deletedIds = action.payload.map(id => String(id));
        state.items = state.items.filter(
          (t) => !deletedIds.includes(String(t.transaction_id || t.id))
        );
      })
      // deleteAllTransactions
      .addCase(deleteAllTransactions.fulfilled, (state) => {
        state.items = [];
      })
      // importTransactions
      .addCase(importTransactions.fulfilled, (state) => {
        // Re-fetch triggered by component after import
      });
  },
});

export const { clearTransactions } = transactionSlice.actions;
export default transactionSlice.reducer;
