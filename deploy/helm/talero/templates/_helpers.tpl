{{- define "talero.name" -}}talero{{- end -}}
{{- define "talero.fullname" -}}{{ printf "%s-%s" (include "talero.name" .) .Release.Name | trunc 63 | trimSuffix "-" }}{{- end -}}
{{- define "talero.labels" -}}
app.kubernetes.io/name: {{ include "talero.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
