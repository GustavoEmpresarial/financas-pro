# validation — vazio de proposito

A validacao do upload nao e de corpo JSON, e sim do arquivo em si: extensao
permitida, tamanho e nome do bucket. Como as tres dependem do
`multipart.FileHeader` e do diretorio de destino, elas moram em
`../service/service.go`, junto do codigo que grava o arquivo — separar deixaria
a regra longe do unico lugar que pode aplicá-la.
