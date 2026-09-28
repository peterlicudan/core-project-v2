<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Compliance;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminComplianceController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | CREATE COMPLIANCE
    |--------------------------------------------------------------------------
    */

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => [
                'required',
                'string',
                'max:255',
            ],
            'type' => [
                'required',
                'string',
                'max:100',
            ],
            'status' => [
                'required',
                'string',
                'max:100',
            ],
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')
                    ->where(fn($query) => $query->where('role', 'staff')),
            ],
            'due_date' => [
                'nullable',
                'date',
            ],
            'expiry_date' => [
                'nullable',
                'date',
                'after_or_equal:due_date',
            ],
            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],
            // ✅ PRIORITY FIELD
            'priority' => [
                'nullable',
                'string',
                'in:High,Medium,Low',
            ],
            // ✅ FILE VALIDATION
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,webp',
                'max:10240', // 10MB
            ],
        ]);

        // ✅ HANDLE FILE UPLOAD
        $filePath = null;
        $fileName = null;
        $fileSize = null;
        $mimeType = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->store('compliance', 'public');
            $fileName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $mimeType = $file->getMimeType();
        }

        // ✅ CREATE RECORD WITH ALL FIELDS
        Compliance::create([
            'title' => $validated['title'],
            'type' => $validated['type'],
            'status' => $validated['status'],
            'assigned_to' => !empty($validated['assigned_to']) ? $validated['assigned_to'] : null,
            'due_date' => $validated['due_date'] ?? null,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'Medium',
            'created_by' => Auth::id(),
            // ✅ FILE FIELDS
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
        ]);

        return redirect()
            ->route('admin.documents.compliance')
            ->with('success', 'Compliance requirement created successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE COMPLIANCE
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, Compliance $compliance): RedirectResponse
    {
        $validated = $request->validate([
            'title' => [
                'required',
                'string',
                'max:255',
            ],
            'type' => [
                'required',
                'string',
                'max:100',
            ],
            'status' => [
                'required',
                'string',
                'max:100',
            ],
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')
                    ->where(fn($query) => $query->where('role', 'staff')),
            ],
            'due_date' => [
                'nullable',
                'date',
            ],
            'expiry_date' => [
                'nullable',
                'date',
                'after_or_equal:due_date',
            ],
            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],
            // ✅ PRIORITY FIELD
            'priority' => [
                'nullable',
                'string',
                'in:High,Medium,Low',
            ],
            // ✅ FILE VALIDATION (nullable para optional)
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,webp',
                'max:10240',
            ],
        ]);

        // ✅ HANDLE FILE UPLOAD (kung may bagong file)
        if ($request->hasFile('file')) {
            // Delete old file if exists
            if ($compliance->file_path) {
                Storage::disk('public')->delete($compliance->file_path);
            }

            $file = $request->file('file');
            $filePath = $file->store('compliance', 'public');
            $fileName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $mimeType = $file->getMimeType();

            // ✅ UPDATE WITH NEW FILE
            $compliance->update([
                'title' => $validated['title'],
                'type' => $validated['type'],
                'status' => $validated['status'],
                'assigned_to' => !empty($validated['assigned_to']) ? $validated['assigned_to'] : null,
                'due_date' => $validated['due_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'description' => $validated['description'] ?? null,
                'priority' => $validated['priority'] ?? 'Medium',
                'file_path' => $filePath,
                'file_name' => $fileName,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
            ]);
        } else {
            // ✅ UPDATE WITHOUT CHANGING FILE
            $compliance->update([
                'title' => $validated['title'],
                'type' => $validated['type'],
                'status' => $validated['status'],
                'assigned_to' => !empty($validated['assigned_to']) ? $validated['assigned_to'] : null,
                'due_date' => $validated['due_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'description' => $validated['description'] ?? null,
                'priority' => $validated['priority'] ?? 'Medium',
            ]);
        }

        return redirect()
            ->route('admin.documents.compliance')
            ->with('success', 'Compliance requirement updated successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE COMPLIANCE
    |--------------------------------------------------------------------------
    */

    public function destroy(Compliance $compliance): RedirectResponse
    {
        // ✅ DELETE FILE FROM STORAGE (kung may file)
        if ($compliance->file_path) {
            Storage::disk('public')->delete($compliance->file_path);
        }

        $compliance->delete();

        return redirect()
            ->route('admin.documents.compliance')
            ->with('success', 'Compliance requirement deleted successfully.');
    }
}