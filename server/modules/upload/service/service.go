// Package service grava os arquivos enviados em disco.
package service

import (
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	httperrors "financaspro/server/core/http/errors"
)

// MaxFileSize e o limite por arquivo — 10 MiB, igual ao @fastify/multipart do
// legado.
const MaxFileSize = 10 << 20

// allowedExts limita o que pode ser gravado.
//
// O legado aceitava qualquer extensao e caia em "png" quando o nome nao tinha
// ponto. Como os arquivos sao servidos de volta em /uploads/, aceitar .html ou
// .svg permitiria hospedar script na mesma origem da aplicacao e roubar o token
// do localStorage.
var allowedExts = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".pdf":  "application/pdf",
}

// bucketPattern limita o nome do bucket a letras, numeros, hifen e underscore.
// Sem isso, bucket "../../etc" escreveria fora do UPLOAD_DIR.
func validBucket(b string) bool {
	if b == "" || len(b) > 40 {
		return false
	}
	for _, r := range b {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
		default:
			return false
		}
	}
	return true
}

type Service struct{ uploadDir string }

func New(uploadDir string) *Service { return &Service{uploadDir: uploadDir} }

// Save grava o arquivo e devolve a URL publica dele.
func (s *Service) Save(file multipart.File, header *multipart.FileHeader, bucket string) (string, error) {
	if bucket == "" {
		bucket = "uploads"
	}
	if !validBucket(bucket) {
		return "", httperrors.BadRequest("Pasta de destino inválida")
	}
	if header.Size > MaxFileSize {
		return "", httperrors.BadRequest("Arquivo maior que 10 MB")
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if _, ok := allowedExts[ext]; !ok {
		return "", httperrors.BadRequest("Tipo de arquivo não permitido: use png, jpg, gif, webp ou pdf")
	}

	// Nome novo, sempre: o nome original do cliente nunca toca o disco.
	name := uuid.NewString() + ext
	dir := filepath.Join(s.uploadDir, bucket)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	dst, err := os.Create(filepath.Join(dir, name))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// LimitReader corta em MaxFileSize mesmo se o Content-Length tiver mentido.
	if _, err := io.Copy(dst, io.LimitReader(file, MaxFileSize)); err != nil {
		return "", err
	}
	return "/uploads/" + bucket + "/" + name, nil
}
