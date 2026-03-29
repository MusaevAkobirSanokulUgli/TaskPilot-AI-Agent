# ============================================================
# TaskPilot - .NET 9 Backend API
# Multi-stage build for production deployment
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY TaskPilot.Api/TaskPilot.Api.csproj TaskPilot.Api/
RUN dotnet restore TaskPilot.Api/TaskPilot.Api.csproj

COPY . .
WORKDIR /src/TaskPilot.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Install curl for healthchecks and create data directory
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data \
    && adduser --disabled-password --gecos "" --uid 1001 appuser \
    && chown -R appuser:appuser /app

USER appuser

ENV ASPNETCORE_URLS=http://+:5002
EXPOSE 5002

ENTRYPOINT ["dotnet", "TaskPilot.Api.dll"]
