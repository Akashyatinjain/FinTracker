// src/store/friendLoanSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";

// ====== Async Thunks ======

export const fetchFriendLoans = createAsyncThunk(
  "friendLoans/fetchFriendLoans",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/api/friend-loans");
      return res.data.loans || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const addFriendLoan = createAsyncThunk(
  "friendLoans/addFriendLoan",
  async (loanData, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/api/friend-loans", loanData);
      return res.data.loan || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const updateFriendLoan = createAsyncThunk(
  "friendLoans/updateFriendLoan",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiClient.put(`/api/friend-loans/${id}`, data);
      return res.data.loan || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const deleteFriendLoan = createAsyncThunk(
  "friendLoans/deleteFriendLoan",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/api/friend-loans/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

// ====== Slice ======

const friendLoanSlice = createSlice({
  name: "friendLoans",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearFriendLoans: (state) => {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriendLoans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriendLoans.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchFriendLoans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addFriendLoan.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateFriendLoan.fulfilled, (state, action) => {
        const payloadLoan = action.payload?.loan || action.payload;
        const targetId = payloadLoan?.loan_id || payloadLoan?.id;
        const idx = state.items.findIndex(
          (l) => String(l.loan_id || l.id) === String(targetId)
        );
        if (idx !== -1 && payloadLoan) {
          state.items[idx] = payloadLoan;
        }
      })
      .addCase(deleteFriendLoan.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (l) => String(l.loan_id || l.id) !== String(action.payload)
        );
      });
  },
});

export const { clearFriendLoans } = friendLoanSlice.actions;
export default friendLoanSlice.reducer;
