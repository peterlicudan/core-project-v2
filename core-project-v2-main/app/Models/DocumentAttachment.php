<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentAttachment extends Model
{
    protected $fillable = [
        'document_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'file_size' => 'integer',
    ];

    protected $appends = [
        'formatted_file_size',
        'file_url',
        'download_url',
        'file_exists',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function getResolvedFilePath(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }

        $raw = $this->file_path;

        if (file_exists($raw) && is_file($raw)) {
            return $raw;
        }

        $clean = ltrim($raw, '/\\');
        $clean = preg_replace('#^(public/|storage/)#i', '', $clean);

        $candidates = [
            \Illuminate\Support\Facades\Storage::disk('public')->path($raw),
            \Illuminate\Support\Facades\Storage::disk('public')->path($clean),
            storage_path('app/public/' . $clean),
            storage_path('app/' . $clean),
            storage_path('app/private/' . $clean),
            public_path('storage/' . $clean),
            public_path($clean),
            storage_path('app/public/documents/' . basename($clean)),
            public_path('documents/' . basename($clean)),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate && file_exists($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function fileExists(): bool
    {
        return $this->getResolvedFilePath() !== null;
    }

    public function getFileExistsAttribute(): bool
    {
        return $this->fileExists();
    }

    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }

        if ($this->exists && $this->document_id && $this->id) {
            return route('documents.view-attachment', [
                'document' => $this->document_id,
                'attachment' => $this->id,
            ]);
        }

        return asset('storage/' . ltrim($this->file_path, '/'));
    }

    public function getDownloadUrlAttribute(): ?string
    {
        if (empty($this->file_path) || !$this->exists || !$this->document_id || !$this->id) {
            return null;
        }

        return route('documents.download-attachment', [
            'document' => $this->document_id,
            'attachment' => $this->id,
        ]);
    }

    public function getFormattedFileSizeAttribute(): ?string
    {
        $bytes = $this->file_size;
        if (!$bytes || $bytes <= 0) return null;

        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, $i === 0 ? 0 : 1) . ' ' . $units[$i];
    }
}
