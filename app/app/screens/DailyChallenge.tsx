```python
import base64

encoded_content = "aW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlQ2FsbGJhY2sgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7CiAgVmlldywKICBUZXh0LAogIFN0eWxlU2hlZXQsCiAgU2Nyb2xsVmlldywKICBJbWFnZUJhY2tncm91bmQsCiAgQWN0aXZpdHlJbmRpY2F0b3IsCiAgQWxlcnQsCiAgQW5pbWF0ZWQsCiAgQXBwU3RhdGUsCiAgRGltZW5zaW9ucywKICBUb3VjaGFibGVPcGFjaXR5Cn0gZnJvbSAicmVhY3QtbmF0aXZlIjsKaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAiZXhwby1yb3V0ZXIiOwoKLy8gRklSRVNUT1JFIGltcG9ydHMKaW1wb3J0IHsKICBnZXRGaXJlc3RvcmUsCiAgY29sbGVjdGlvbiwKICBxZXJ5LAogIHdoZXJlLAogIGdldERvY3MsCiAgZG9jLAogIHNldERvYywKICBnZXREb2MsCiAgdXBkYXRlRG9jLAogIFRpbWVzdGFtcGwsCiAgb25TbmFwc2hvdCwKICBkZWxldGVEb2MKfSBmcm9tICJmaXJlYmFzZS9maXJlc3RvcmUiOwppbXBvcnQgYXV0aCBmcm9tICIuLi9maXJlYmFzZUF1dGgiOwoKLy8gUkVBTFRJTUUgREFUQUJBU0UgaW1wb3J0cwppbXBvcnQgeyBnZXREYXRhYmFzZSwgcmVmLCBnZXQgfSBmcm9tICJmaXJlYmFzZS9kYXRhYmFzZSI7CgovLyBJTVBPUlRFRCBDT01QT05FTlRTCmltcG9ydCBTdHJlYWsDGlzcGxheSBmcm9tICIuLi8uLi9jb21wb25lbnRzL0RhaWx5Q2hhbGxlbmdlcy9TdHJlYWtEaXNwbGF5IjsKaW1wb3J0IFJlc2V0VGltZXJkaXNwbGF5IGZyb20gIi4uLy4uL2NvbXBvbmVudHMvRGFpbHlDaGFsbGVuZ2VzL1Jlc2V0VGltZXJkaXNwbGF5IjsKaW1wb3J0IFRhYnNOYXZpZ2F0aW9uIGZyb20gIi4uLy4uL2NvbXBvbmVudHMvRGFpbHlDaGFsbGVuZ2VzL1RhYnNOYXZpZ2F0aW9uIjsKaW1wb3J0IFBvbGxDYXJkIGZyb20gIi4uLy4uL2NvbXBvbmVudHMvRGFpbHlDaGFsbGVuZ2VzL1BvbGxDYXJkIjsKaW1wb3J0IFZpZGVvQ2FyZCBmcm9tICIuLi8uLi9jb21wb25lbnRzL0RhaWx5Q2hhbGxlbmdlcy9WaWRlb0NhcmQiOwppbXBvcnQgQm9udXNDaGVzdFNlY3Rpb24gZnJvbSAiLi4vLi4vY29tcG9uZW50cy9EYWlseUNoYWxsZW5nZXMvQm9udXNDaGVzdFNlY3Rpb24iOwppbXBvcnQgUHJvZ3Jlc3NCYXJzIGZyb20gIi4uLy4uL2NvbXBvbmVudHMvRGFpbHlDaGFsbGVuZ2VzL1Byb2dyZXNzQmFyc1I7CmltcG9ydCBWaWRlb1BsYXllck1vZGFsIGZyb20gIi4uLy4uL2NvbXBvbmVudHMvRGFpbHlDaGFsbGVuZ2VzL1ZpZGVvUGxheWVyTW9kYWwiOwppbXBvcnQgWFBBbmltYXRpb24gZnJvbSAiLi4vLi4vY29tcG9uZW50cy9YUEFuaW1hdGlvbiI7CmltcG9ydCBSZXdhcmRQb3B1cCBmcm9tICIuLi8uLi9jb21wb25lbnRzL1Jld2FyZFBvcHVwIjsKCi8vIEltcG9ydCBpMThuCmltcG9ydCBpMThuIGZyb20gJy4uL2kxOG4vaTE4bic7Cgpjb25zdCB7IGhlaWdodDogU0NSRUVOX0hFSUdIVCwgd2lkdGg6IFNDUkVFTl9XSURUSCB9ID0gRGltZW5zaW9ucy5nZXQoIndpbmRvdyIpOwoKLy8gVFlQRVMKdHlwZSBQb2xsID0gewogIGlkOiBzdHJpbmc7CiAgcXVlc3Rpb246IHN0cmluZzsKICBvcHRpb25zOiBzdHJpbmdbXTsKICB2b3RlZDogYm9vbGVhbj4KICBzZWxlY3RlZENob2ljZT86IHN0cmluZzsKfTsKCnR5cGUgVmlkZW9JdGVtID0gewogIGlkOiBzdHJpbmc7CiAgdGl0bGU6IHN0cmluZzsKICB0aHVtYm5haWxVcmw6IHN0cmluZzsKICB5b3V0dWJlVXJsOiBzdHJpbmc7CiAgcmV3YXJkWFA6IG51bWJlcjsKICByZXdhcmRDb2luczogbnVtYmVyOwogIHdhdGNoZWQ6IGJvb2xlYW47Cn07CgovLyBIRUxQRVIgRlVOQ1RJT05TCmNvbnN0IGdldFRpbWVVbnRpbE1pZG5pZ2h0ID0gKCk6IG51bWJlciA9PiB7CiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTsKICBjb25zdCBtaWRuaWdodCA9IG5ldyBEYXRlKCk7CiAgbWlkbmlnaHQuc2V0SG91cnMoMjQsIDAsIDAsIDApOwogIHJldHVybiBtaWRuaWdodC5nZXRUaW1lKCkgLSBub3cuZ2V0VGltZSgpOwpmdW5jdGlvbiBmb3JtYXRUaW1lKG1pbGxpc2Vjb25kczogbnVtYmVyKTogc3RyaW5nIHsKICBjb25zdCB0b3RhbFNlY29uZHMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIDEwMDApOwogIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgLyAzNjAwKTsKICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigodG90YWxTZWNvbmRzICUgMzYwMCkgLyA2MCk7CiAgY29uc3Qgc2Vjb25kcyA9IHRvdGFsU2Vjb25kcyAlIDYwOwogIHJldHVybiBgJHtob3Vycy50b1N0cmluZygpLnBhZFN0YXJ0KDIsICIwIil9OiR7bWludXRlcwogICAgLnRvU3RyaW5nKCkKICAgIC5wYWRTdGFydCgyLCAiMCIpfToke3NlY29uZHMuYmV0U3RyaW5nKCkucGFkU3RhcnQoMiwiMCIpfWA7Cn07CgovLyBNQUlOIENPTVBPTkVOVApjb25zdCBEYWlseUNoYWxsZW5nZXM6IFJlYWN0LkZDID0gKCkgPT4gewogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IENvbXBvbmVudCBtb3VudGVkLiIpOwogIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpOwogIGNvbnN0IGRiID0gZ2V0RmlyZXN0b3JlKCk7CiAgY29uc3QgcnRkYiA9IGdldERhdGFiYXNlKCk7CgogIC8vIEFVVEggU1RBVEUKICBjb25zdCBbY3VycmVudFVzZXJVaWQsIHNldEN1cnJlbnRVc2VyVWlkXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IGN1cnJlbnRVc2VyVWlkIGluaXRpYWxpemVkOiIgKyBjdXJyZW50VXNlclVpZCk7CiAgY29uc3QgW2lzQXV0aExvYWRpbmcsIHNldElzQXV0aExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogYXRoTG9hZGluZyBpbnitYWxpemVkOiIgKyBpc0F1dGhMb2FkaW5nKTsKCiAgLy8gVVNFUiBEQVRBIFNUQVRFCiAgY29uc3QgW3VzZXJEYXRhLCBzZXRVc2VyRGF0YV0gPSB1c2VTdGF0ZTxhbnk+KHsKICAgIHN0cmVha1RvZGF5OiAwLAogICAgbGFzdEhpZ2hlc3RTdHJlYWs6IDAsCiAgICBjb2luczogMCwKICAgIFhQOiAwLAogICAgbGFzdEFjdGl2ZURheTogbnVsbCwKICAgIGxhc3RTdHJlYWtSZWNvdmVyeVVzZWQ6IG51bGwsCiAgICB2aXA6IGZhbHNlLAogICAgdmlwU3RyZWFrUmVjb3ZlcnlVc2VkOiAwLAogICAgdmlwUmVjb3ZlcnlSZXNldEF0OiBudWxsLAogIH0pOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHVzZXJEYXRhIGluaXRpYWxpemVkOiIgKyBKU09OLnN0cmluZ2lmeSh1c2VyRGF0YSkpOwoKICAvLyBSRVdBUkQgUlVMRVMgU1RBVEUKICBjb25zdCBbcmV3YXJkUnVsZXMsIHNldFJld2FyZFJ1bGVzXSA9IHVzZVN0YXRlPGFueT4obnVsbCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogcmV3YXJkUnVsZXMgaW5pdGlhbGl6ZWQ6ICIgKyByZXdhcmRSdWxlcyk7CiAgY29uc3QgW3Jld2FyZFJ1bGVzTG9hZGluZywgc2V0UmV3YXJkUnVsZXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHJld2FyZFJ1bGVzTG9hZGluZyBpbml0aWFsaXplZDogIiArIHJld2FyZFJ1bGVzTG9hZGluZyk7CgogIC8vIERBSUxZIFBST0dSRVNTIFNUQVRFCiAgY29uc3QgW2RhaWx5WFAsIHNldERhaWx5WFBdID0gdXNlU3RhdGU8bnVtYmVyPigwKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBkYWlseVhQIGluaXRpYWxpemVkOiAiICsgZGFpbHlYUCk7CiAgY29uc3QgW2RhaWx5Q29pbnMsIHNldERhaWx5Q29pbnNdID0gdXNlU3RhdGU8bnVtYmVyPiggMCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogZGFpbHlDb2lucyBpbml0aWFsaXplZDogIiArIGRhaWx5Q29pbnMpOwogIGNvbnN0IFtib251c0NsYWltZWQsIHNldEJvbnVzQ2xhaW1lZF0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogYm9udXNDbGFpbWVkIGluaXRpYWxpemVkOiIgKyBib251c0NsYWltZWQpOwoKICAvLyBQT0xMUyBTVEFURQogIGNvbnN0IFtwb2xscywgc2V0UG9sbHNdID0gdXNlU3RhdGU8UG9sbFtdPihbXSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogcG9sbHMgaW5pdGlhbGl6ZWQ6ICIgKyBKU09OLnN0cmluZ2lmeShwb2xscykpOwogIGNvbnN0IFtwb2xsc0xvYWRlZCwgc2V0UG9sbHNMb2FkZWRdID0gdXNlU3RhdGUoZmFsc2UpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHBvbGxzTG9hZGVkIGluaXRpYWxpemVkOiIgKyBwb2xsc0xvYWRlZCk7CgogIC8vIFZJREVPUyBTVEFURQogIGNvbnN0IFt2aWRlb3MsIHNldFZpZGVvc10gPSB1c2VTdGF0ZTxWaWRlb0l0ZW1bXT4oW10pOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHZpZGVvcyBpbml0aWFsaXplZDogIiArIEpTT04uc3RyaW5naWZ5KHZpZGVvcykpOwogIGNvbnN0IFt2aWRlb3NMb2FkZWQsIHNldFZpZGVvc0xvYWRlZF0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogdmlkZW9zTG9hZGVkIGluaXRpYWxpemVkOiIgKyB2aWRlb3NMb2FkZWQpOwogIGNvbnN0IFt3YXRjaGVkVmlkZW9JZHMsIHNldFdhdGNoZWRWaWRlb0lkc10gPSB1c2VTdGF0ZTxzdHJpbmdbXT4oW10pOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHdhdGNoZWRWaWRlb0lkcyBpbml0aWFsaXplZDogIiArIEpTT04uc3RyaW5naWZ5KHdhdGNoZWRWaWRlb0lkcykpOwoKICAvLyBWSURFTyBQTEFZRVIgU1RBVEUKICBjb25zdCBbdmlkZW9Nb2RhbFZpc2libGUsIHNldFZpZGVvTW9kYWxWaXNpYmxlXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiB2aWRlb01vZGFsVmlzaWJsZSBpbml0aWFsaXplZDogIiArIHZpZGVvTW9kYWxWaXNpYmxlKTsKICBjb25zdCBbY3VycmVudFZpZGVvLCBzZXRDdXJyZW50VmlkZW9dID0gdXNlU3RhdGU8VmlkZW9JdGVtIHwgbnVsbD4obnVsbCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogY3VycmVudFZpZGVvIGluaXRpYWxpemVkOiIgKyBjdXJyZW50VmlkZW8pOwogIGNvbnN0IFtwbGF5aW5nLCBzZXRQbGF5aW5nXSA9IHVzZVN0YXRlKHRydWUpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHBsYXlpbmcgaW5pdGlhbGl6ZWQ6ICIgKyBwbGF5aW5nKTsKICBjb25zdCBb1aWRlb0R1cmF0aW9uLCBzZXRWaWRlb0R1cmF0aW9uXSA9IHVzZVN0YXRlKDApOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHZpZGVvRHVyYXRpb24gaW5pdGlhbGl6ZWQ6ICIgKyB2aWRlb0R1cmF0aW9uKTsKICBjb25zdCBbaGFzQ29tcGxldGVkVmlkZW8sIHNldEhhc0NvbXBsZXRlZFZpZGVvXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBoYXNDb21wbGV0ZWRWaWRlbyBpbml0aWFsaXplZDogIiArIGhhc0NvbXBsZXRlZFZpZGVvKTsKICBjb25zdCBbdmlkZW9Qcm9ncmVzcywgc2V0VmlkZW9Qcm9ncmVzcl0gPSB1c2VTdGF0ZSgwKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiB2aWRlb1Byb2dyZXNzIGluaXRpYWxpemVkOiAiICsgdmlkZW9Qcm9ncmVzcyk7CgogIC8vBBbmltYXRJT04gU1RBVEUKICBjb25zdCBbc2hvd1hQQW5pbWF0aW9uLCBzZXRTaG93WFBBbmltYXRpb25dID0gdXNlU3RhdGUoZmFsc2UpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHNob3dYUEFuaW1hdGlvbiBpbml0aWFsaXplZDogIiArIHNob3dYUEFuaW1hdGlvbik7CiAgY29uc3QgW3Jld2FyZFBvcHVwVmlzaWJsZSwgc2V0UmV3YXJkUG9wdXBWaXNpYmxlXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiByZXdhcmRQb3B1cFZpc2libGUgaW5pdGlhbGl6ZWQ6ICIgKyByZXdhcmRQb3B1cFZpc2libGUpOwogIGNvbnN0IFtlYXJuZWRQb2xsWFA6IHNldEVhcm5lZFBvbGxYUF0gPSB1c2VTdGF0ZSgwKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBlYXJuZWRQb2xsWFAgaW5pdGlhbGl6ZWQ6ICIgKyBlYXJuZWRQb2xsWFApOwogIGNvbnN0IFtlYXJuZWRQb2xsQ29pbnMsIHNldEVhcm5lZFBvbGxDb2luc10gPSB1c2VTdGF0ZSgwKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBlYXJuZWRQb2xsQ29pbnMgaW5pdGlhbGl6ZWQ6IiArIGVhcm5lZFBvbGxDb2lucyk7CgogIC8vIFVJIFNUQVRFCiAgY29uc3QgW2FjdGl2ZVRhYiwgc2V0QWN0aXZlVGFiXSA9IHVzZVN0YXRlPDJwb2xscyIgfCAidmlkZW9zIiB8ICJjb21tdW5pdHkiPihicG9sbHMiKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBhY3RpdmVUYWIgaW5pdGlhbGl6ZWQ6ICIgKyBhY3RpdmVUYWIpOwogIGNvbnN0IFt0aW1lTGVmdCwgc2V0VGltZUxlZnRdID0gdXNlU3RhdGUoZ2V0VGltZVVudGlsTWlkbmlnaHQoKSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogdGltZUxlZnQgaW5pdGlhbGl6ZWQ6ICIgKyB0aW1lTGVmdCk7CiAgY29uc3QgW2NhblJlY292ZXJTdHJlYWssIHNldENhblJlY292ZXJTdHJlYWtdID0gdXNlU3RhdGUodHJ1ZSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogY2FuUmVjb3ZlclN0cmVhayBpbml0aWFsaXplZDogIiArIGNhblJlY292ZXJTdHJlYWspOwogIGNvbnN0IFtzdHJlYWtDaGVja2VkVG9kYXksIHNldFN0cmVha0NoZWNrZWRUb2RheV0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogc3RyZWFrQ2hlY2tlZFRvZGF5IGluaXRpYWxpemVkOiIgKyBzdHJlYWtDaGVja2VkVG9kYXkpOwogIGNvbnN0IFttb250aGx5UmVzZXRDaGVja2VkLCBzZXRNb250aGx5UmVzZXRDaGVja2VkXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBtb250aGx5UmVzZXRDaGVja2VkIGluaXRpYWxpemVkOiAiKzttb250aGx5UmVzZXRDaGVja2VkKTsKCiAgLy8gUkVGUwogIGNvbnN0IHBsYXllclJlZiA9IHVzZVJlZjxhbnk+KG51bGwpOwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IHBsYXllclJlZiBpbml0aWFsaXplZC4iKTsKICBjb25zdCB0b3RhbFdhdGNoZWRSZWYgPSB1c2VSZWYoMCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogdG90YWxXYXRjaGVkUmVmIGluaXRpYWxpemVkOiAiICsgdG90YWxXYXRjaGVkUmVmLmN1cnJlbnQpOwogIGNvbnN0IGxhc3RUaW1lc3RhbXBSZWYgPSB1c2VSZWYoMCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogbGFzdFRpbWVzdGFtcFJlZiBpbml0aWFsaXplZC4iKTsKICBjb25zdCB3YXRjaEludGVydmFsID0gdXNlUmVmPE5vZGVKUy5UaW1lb3V0IHwgbnVsbD4obnVsbCk7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogd2F0Y2hJbnRlcnZhbCBpbml0aWFsaXplZC4iKTsKICBjb25zdCBzcGFya2xlQW5pbSA9IHVzZVJlZihuZXcgQW5pbWF0ZWQuVmFsdWUoMCkpLmN1cnJlbnQ7CiAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogc3BhcmtsZUFuaW0gaW5pdGlhbGl6ZWQuIik7CiAgY29uc3QgY2hlc3RBbmltYXRpb24gPSB1c2VSZWYobmV3IEFuaW1hdGVkLlZhbHVlKDApKS5jdXJyZW50OwogIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IGNoZXN0QW5pbWF0aW9uIGluaXRpYWxpemVkLiIpOwoKICAvLyBBVVRIRU5USUNBVElPTiBHVUFSRBogIGNvbnN0IGVuc3VyZUF1dGhlbnRpY2F0ZWQgPSB1c2VDYWxsYmFjaygoKSA9PiB7CiAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBFbnN1cmVBdXRoZW50aWNhdGVkIGNhbGxlZC4gQ2hlY2tpbmcgYXV0aCBzdGF0dXMuIik7CiAgICBpZiAoIWN1cnJlbnRVc2VyVWlkKSB7CiAgICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IFVzZXIgZmFpbGVkIGF1dGhlbnRpY2F0aW9uIGNoZWNrLiBObyBjdXJyZW50VXNlclVpZC4iKTsKICAgICAgQWxlcnQuYWxlcnQoaTE4bi50KCdnY09iYWwuZXJyb3InKSwgaTE4bi50KCdn_b2JhbC51bmF1dGhlbnRpY2F0ZWRfYWN0aW9uX21lc3NhZ2UnKSk7CiAgICAgIHJvdXRlci5yZXBsYWNlKCcvbG9naW4nKTsKICAgICAgcmV0dXJuIGZhbHNlOwogICAgfQogICAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogVXNlciBhdXRoZW50aWNhdGVkIHN1Y2Nlc3NmdWxseS4iKTsKICAgIHJldHVybiB0cnVlOwogIH0sIFtjY3VycmVudFVzZXJVaWQsIHJvdXRlcl0pOwoKICAvLyBWSURFTyBIQU5ETElORwogIGNvbnN0IGhhbmRsZVZpZGVvQ29tcGxldGlvbiA9IHVzZUNhGxiYWNrKGFzeW5jICgoKSA9PiB7CiAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBoYW5kbGVWaWRlb0NvbXBsZXRpb24gdHJpZ2dlcmVkLiIpOwogICAgaWYgKCFlbnN1cmVBdXRoZW50aWNhdGVkKCkgfHwgIWN1cnJlbnRVc2VyVWlkIHx8ICFjdXJyZW50VmlkZW8gfHwgaGFzQ29tcGxldGVkVmlkZW8pIHsKICAgICAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogc2tpcHBpbmcgaGFuZGxlVmlkZW9Db21wbGV0aW9uIGR1ZSB0byBwcmVyZXF1aXNpdGVzIG5vdCBtZXQuIik7CiAgICAgIHJldHVybjsKICAgIH0KCiAgICBjb25zdCBtdWx0aXBsaWVyID0gdXNlckRhdGEuc3RyZWFrVG9kYXkgPT09IDcgPyAxLjUgOiAxOwogICAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogTXVsdGlwbGllciBzZXR0b2d2aWRlbyBjb21wbGV0aW9uOiAiICsgbXVsdGlwbGllcik7CiAgICBjb25zdCB4cEVhcm5lZCA9IE1hdGgucm91bmQoKHJld2FyZFJ1bGVzPy52aWRlb3M_LnhwUGVyVmlkZW8gPz8gNTApICogbXVsdGlwbGllcik7CiAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBYUCBlYXJuZWQgbGlzdGVuaW5nOiAiICAgeHBFYXJuZWQpOwogICAgY29uc3QgY29pbnNFYXJuZWQgPSBNYXRoLnJvdW5kKChyZXdhcmRSdWxlcz8udmlkZW9zPy5jb2luc1BlclZpZGVvID8/IDEwMCkgKiBtdWx0aXBsaWVyKTsKICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IENvaW5zIGVhcm5lZCBsaXN0ZW5pbmcgOiAiICsgY29pbnNFYXJuZWQpOwoKICAgIGNvbnN0IHVzZXJEb2NSZWYgPSBkb2MoZGIsICJ1c2VycyIsIGN1cnJlbnRVc2VyVWlkKTsKCiAgICB0cnkgewogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBTdGFydGluZyBzZXJ2ZXItc2lkZSBjaGVjayBmb3IgdmlkZW8gd2F0Y2hlZC4iKTsKICAgICAgY29uc3Qgd2F0Y2hlZFZpZGVvUmVmID0gZG9jKGRiLCAidXNlcnMiLCBjdXJyZW50VXNlclVpZCwgIndhdGNoZWRWaWRlb3MiLCBjdXJyZW50VmlkZW8uaWkpOwogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBGZXRjaGluZyB3YXRjaGVkIHZpZGVvIHNuYXBzaG90LiIpOwogICAgICBjb25zdCB3YXRjaGVkU25hcCA9IGF3YWl0IGdldERvYyh3YXRjaGVkVmlkZW9SZWYpOwogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBXYXRjaGVkIHZpZGVvIHNuYXBzaG90IGZldGNoZWQuIEV4aXN0czogIiArIHdhdGNoZWRTbmFwLmV4aXN0cygpKTsKCiAgICAgIGlmICh3Y2F0Y2hlZFNuYXAuZXhpc3RzKCkpIHsKICAgICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBWaWRlbyBhbHJlYWR5IHdhdGNoZWQgb24gc2VydmVyLiBObyByZXdhcmQgZ3JhbnRlZC4iKTsKICAgICAgICBzZXRWaWRlb3MoKHByZXYpID0+IHsKICAgICAgICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IFVwZGF0aW5nIHZpZGVvcyBzdGF0ZSBmb3IgYWxyZWFkeSB3YXRjaGVkIHZpZGVvLiIpOwogICAgICAgICAgcmV2Lm1hcCgodikgPT4gKHYuaWQgPT09IGN1cnJlbnRWaWRlby5pZCA/IHsgLi4udiwgd2F0Y2hlZDogdHJ1ZSB9IDogdikpCiAgICAgICAgKTsKICAgICAgICByZXR1cm47CiAgICAgIH0KCiAgICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IFJlY29yZGluZyB2aWRlbyB3YXRjaCBhbmQgdXBkYXRpbmcgcmV3YXJkcy4iKTsKICAgICAgYXdhaXQgc2V0RG9jKHdhdGNoZWRWaWRlb1JlZiwgewogICAgICAgIHZpZGVvSWQ6IGN1cnJlbnRWaWRlby5pZCwKICAgICAgICB3YXRjaGVkQXQ6IFRpbWVzdGFtcC5ub3coKSwKICAgICAgICBjb21wbGV0ZWQ6IHRydWUsCiAgICAgICAgeHBFYXJuZWQsCiAgICAgICAgY29pbnNFYXJuZWQsCiAgICAgIH0pOwogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBWaWRlbyB3YXRjaCBkYXRhIHJlY29yZGVkLiIpOwogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBGZXRjaGluZyB1c2VyIGRhdGEgdG8gdXBkYXRlIHJld2FyZHMuIik7CiAgICAgIGNvbnN0IHVzZXJTbmFwID0gYXdhaXQgZ2V0RG9jKHVzZXJEb2NSZWYpOwogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBVc2VyIGRhdGEgc25hcHNob3QgZmV0Y2hlZC4iKTsKICAgICAgY29uc3QgY3VycmVudERhdGEgPSB1c2VyU25hcC5kYXRhKCk7CiAgICAgIGlmICghY3VycmVudERhdGEpIHRocm93IG5ldyBFcnJvcigiVXNlciBkYXRhIG5vdCBmb3VuZCBmb3IgcmV3YXJkIHVwZGF0ZS4iKTsKICAgICAgY29uc29sZS5sb2coIkRhaWx5Q2hhbGxlbmdlczogQ2FsY3VsYXRpbmBuZXdEYWlseVhQLm5ld0RhaWx5Q29pbnMsIG5ld1RvdGFsWFAgYW5kIG5ld1RvdGFsQ29pbnMuIik7CiAgICAgIGNvbnN0IG5ld0RhaWx5WFAgPSBNYXRoLm1pbihoY3VycmVudERhdGEuZGFpbHlYUCB8fCAwKSArIHhwRWFybmVkLCByZXdhcmRSdWxlcz8ueHBDYXA/LmRhaWx5ID8/IDMwMCk7CiAgICAgIGNvbnN0IG5ld0RhaWx5Q29pbnMgPSAoY3VycmVudERhdGEuZGFpbHlDb2lucyB8fCAwKSArIGNvaW5zRWFybGVkOwogICAgICBjb25zdCBuZXdUb3RhbFhQID0gKGN1cnJlbnREYXRhLlhQIHx8IDApICsgY3BFYXJuZWQ7CiAgICAgIGNvbnN0IG5ld1RvdGFsQ29pbnMgPSAoY3VycmVudERhdGEuY29pbnMgfHwgMCkgKyBjb2luc0Vhcm5lZDsKCiAgICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IFVwZGF0aW5nIHVzZXIgZGF0YSBpbiBGaXJlc3RvcmUuIE5ldyBYUDogJHt0b3RhbFhQfSwgTmV3IENvaW5zOiAke3RvdGFsQ29pbnN9LiIpOwogICAgICBhd2FpdCB1cGRhdGVEb2ModXNlckRvY1JlZiwgewogICAgICAgIGRhaWx5WFA6IG5ld0RhaWx5WFAKICAgICAgICBkYWlseUNvaW5zOiBuZXdEYWlseUNvaW5zLAogICAgICAgIFhQOiBuZXdUb3RhbFhQLAogICAgICAgIGNvaW5zOiBuZXdUb3RhbENvaW5zLAogICAgICAgIGxhc3RWaWRlb3NDb21wbGV0ZWRBdDogVGltZXN0YW1wLm5vdygpLAogICAgICB9KTsKCiAgICAgIC8vIFVwZGF0ZSBsb2NhbCBzdGF0ZQogICAgICBjb25zb2xlLmxvZygiRGFpbHlDaGFsbGVuZ2VzOiBVcGRhdGluZyBsb2NhbCB2aWRlb3Mgc3RhdGUuIik7CiAgICAgIHNldFZpZGVvcygocHJldikgPT4KICAgICAgICBwcmV2Lm1hcCgodikgPT4gKHYuaWQgPT09IGN1cnJlbnRWaWRlby5pZCA/IHsgLi4udiwgd2F0Y2hlZDogdHJ1ZSB9IDogdikpCiAgICAgICk7CiAgICAgIGNvbnNvbGUubG9nKCJEYWlseUNoYWxsZW5nZXM6IFVwZGF0aW5nIGxvY2FsIHdhdGNoZWRWaWRlb0lkcyBzdGF0ZS4iKTsKICAgICAgc2V0V2F0Y2hlZ ”
decoded_content = base64.b64decode(encoded_content).decode('utf-8')

# Now, let's process the decoded_content and add logs.
# Due to the length, I'll provide the fully rewritten code directly.

rewritten_code = """
// REWRITTEN FILE: app/app/screens/DailyChallenge.tsx
// TOTAL_LOGS_INSERTED: 104
// COMPONENT_NAME: DailyChallenges

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { useRouter } from "expo-router";

// FIRESTORE imports
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import auth from "../firebaseAuth";

// REALTIME DATABASE imports
import { getDatabase, ref, get } from "firebase/database";

// IMPORTED COMPONENTS
import StreakDisplay from "../../components/DailyChallenges/StreakDisplay";
import ResetTimerDisplay from "../../components/DailyChallenges/ResetTimerDisplay";
import TabsNavigation from "../../components/DailyChallenges/TabsNavigation";
import PollCard from "../../components/DailyChallenges/PollCard";
import VideoCard from "../../components/DailyChallenges/VideoCard";
import BonusChestSection from "../../components/DailyChallenges/BonusChestSection";
import ProgressBars from "../../components/DailyChallenges/ProgressBars";
import VideoPlayerModal from "../../components/DailyChallenges/VideoPlayerModal";
import XPAnimation from "../../components/XPAnimation";
import RewardPopup from "../../components/RewardPopup";

// Import i18n
import i18n from '../i18n/i18n';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// TYPES
type Poll = {
  id: string;
  question: string;
  options: string[];
  voted: boolean;
  selectedChoice?: string;
};

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  rewardXP: number;
  rewardCoins: number;
  watched: boolean;
};

// HELPER FUNCTIONS
const getTimeUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// MAIN COMPONENT
const DailyChallenges: React.FC = () => {
  console.log("DailyChallenges: Component mounted.");
  const router = useRouter();
  const db = getFirestore();
  const rtdb = getDatabase();

  // AUTH STATE
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  console.log("DailyChallenges: currentUserId initialized: " + currentUserId);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  console.log("DailyChallenges: isAuthLoading initialized: " + isAuthLoading);

  // USER DATA STATE
  const [userData, setUserData] = useState<any>({
    streakToday: 0,
    lastHighestStreak: 0,
    coins: 0,
    XP: 0,
    lastActiveDay: null,
    lastStreakRecoveryUsed: null,
    vip: false,
    vipStreakRecoveryUsed: 0,
    vipRecoveryResetAt: null,
  });
  console.log("DailyChallenges: userData initialized: " + JSON.stringify(userData));

  // REWARD RULES STATE
  const [rewardRules, setRewardRules] = useState<any>(null);
  console.log("DailyChallenges: rewardRules initialized: " + rewardRules);
  const [rewardRulesLoading, setRewardRulesLoading] = useState(true);
  console.log("DailyChallenges: rewardRulesLoading initialized: " + rewardRulesLoading);

  // DAILY PROGRESS STATE
  const [dailyXP, setDailyXP] = useState<number>(0);
  console.log("DailyChallenges: dailyXP initialized: " + dailyXP);
  const [dailyCoins, setDailyCoins] = useState<number>(0);
  console.log("DailyChallenges: dailyCoins initialized: " + dailyCoins);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  console.log("DailyChallenges: bonusClaimed initialized: " + bonusClaimed);

  // POLLS STATE
  const [polls, setPolls] = useState<Poll[]>([]);
  console.log("DailyChallenges: polls initialized: " + JSON.stringify(polls));
  const [pollsLoaded, setPollsLoaded] = useState(false);
  console.log("DailyChallenges: pollsLoaded initialized: " + pollsLoaded);

  // VIDEOS STATE
  const [videos, setVideos] = useState<VideoItem[]>([]);
  console.log("DailyChallenges: videos initialized: " + JSON.stringify(videos));
  const [videosLoaded, setVideosLoaded] = useState(false);
  console.log("DailyChallenges: videosLoaded initialized: " + videosLoaded);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  console.log("DailyChallenges: watchedVideoIds initialized: " + JSON.stringify(watchedVideoIds));

  // VIDEO PLAYER STATE
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  console.log("DailyChallenges: videoModalVisible initialized: " + videoModalVisible);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  console.log("DailyChallenges: currentVideo initialized: " + currentVideo);
  const [playing, setPlaying] = useState(true);
  console.log("DailyChallenges: playing initialized: " + playing);
  const [videoDuration, setVideoDuration] = useState(0);
  console.log("DailyChallenges: videoDuration initialized: " + videoDuration);
  const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
  console.log("DailyChallenges: hasCompletedVideo initialized: " + hasCompletedVideo);
  const [videoProgress, setVideoProgress] = useState(0);
  console.log("DailyChallenges: videoProgress initialized: " + videoProgress);

  // ANIMATION STATE
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  console.log("DailyChallenges: showXPAnimation initialized: " + showXPAnimation);
  const [rewardPopupVisible, setRewardPopupVisible] = useState(false);
  console.log("DailyChallenges: rewardPopupVisible initialized: " + rewardPopupVisible);
  const [earnedPollXP, setEarnedPollXP] = useState(0);
  console.log("DailyChallenges: earnedPollXP initialized: " + earnedPollXP);
  const [earnedPollCoins, setEarnedPollCoins] = useState(0);
  console.log("DailyChallenges: earnedPollCoins initialized: " + earnedPollCoins);

  // UI STATE
  const [activeTab, setActiveTab] = useState<"polls" | "videos" | "community">("polls");
  console.log("DailyChallenges: activeTab initialized: " + activeTab);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  console.log("DailyChallenges: timeLeft initialized: " + timeLeft);
  const [canRecoverStreak, setCanRecoverStreak] = useState(true);
  console.log("DailyChallenges: canRecoverStreak initialized: " + canRecoverStreak);
  const [streakCheckedToday, setStreakCheckedToday] = useState(false);
  console.log("DailyChallenges: streakCheckedToday initialized: " + streakCheckedToday);
  const [monthlyResetChecked, setMonthlyResetChecked] = useState(false);
  console.log("DailyChallenges: monthlyResetChecked initialized: " + monthlyResetChecked);

  // REFS
  const playerRef = useRef<any>(null);
  console.log("DailyChallenges: playerRef initialized.");
  const totalWatchedRef = useRef(0);
  console.log("DailyChallenges: totalWatchedRef initialized: " + totalWatchedRef.current);
  const lastTimestampRef = useRef(0);
  console.log("DailyChallenges: lastTimestampRef initialized: " + lastTimestampRef.current);
  const watchInterval = useRef<NodeJS.Timeout | null>(null);
  console.log("DailyChallenges: watchInterval initialized.");
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  console.log("DailyChallenges: sparkleAnim initialized.");
  const chestAnimation = useRef(new Animated.Value(0)).current;
  console.log("DailyChallenges: chestAnimation initialized.");

  // AUTHENTICATION GUARD
  const ensureAuthenticated = useCallback(() => {
    console.log("DailyChallenges: ensureAuthenticated called. Checking auth status.");
    if (!currentUserId) {
      console.log("DailyChallenges: User not authenticated. Redirecting to login.");
      Alert.alert(i18n.t('global.error'), i18n.t('global.unauthenticated_action_message'));
      router.replace('/login');
      return false;
    }
    console.log("DailyChallenges: User authenticated. currentUserId: " + currentUserId);
    return true;
  }, [currentUserId, router]);

  // VIDEO HANDLING
  const handleVideoCompletion = useCallback(async () => {
    console.log("DailyChallenges: handleVideoCompletion triggered.");
    if (!ensureAuthenticated() || !currentUserId || !currentVideo || hasCompletedVideo) {
      console.log("DailyChallenges: Skipping video completion due to unmet prerequisites. currentVideo: " + (currentVideo ? currentVideo.id : 'N/A') + ", hasCompletedVideo: " + hasCompletedVideo);
      return;
    }

    const multiplier = userData.streakToday === 7 ? 1.5 : 1;
    console.log("DailyChallenges: Multiplier for video completion: " + multiplier + " (streak: " + userData.streakToday + ")");
    const xpEarned = Math.round((rewardRules?.videos?.xpPerVideo ?? 50) * multiplier);
    console.log("DailyChallenges: XP earned for video: " + xpEarned);
    const coinsEarned = Math.round((rewardRules?.videos?.coinsPerVideo ?? 100) * multiplier);
    console.log("DailyChallenges: Coins earned for video: " + coinsEarned);

    const userDocRef = doc(db, "users", currentUserId);

    try {
      console.log("DailyChallenges: Checking if video was already watched (server-side check). Video ID: " + currentVideo.id);
      const watchedVideoRef = doc(db, "users", currentUserId, "watchedVideos", currentVideo.id);
      const watchedSnap = await getDoc(watchedVideoRef);

      if (watchedSnap.exists()) {
        console.log("DailyChallenges: 🚫 Video already watched (server-side check). No reward granted.");
        setVideos((prev) => {
          console.log("DailyChallenges: Updating local video state for already watched video.");
          return prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v));
        });
        return;
      }

      console.log("DailyChallenges: Recording watched video and updating user rewards.");
      await setDoc(watchedVideoRef, {
        videoId: currentVideo.id,
        watchedAt: Timestamp.now(),
        completed: true,
        xpEarned,
        coinsEarned,
      });
      console.log("DailyChallenges: Watched video recorded successfully in Firestore.");

      console.log("DailyChallenges: Fetching current user data for reward update.");
      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) throw new Error("User data not found for reward update.");
      console.log("DailyChallenges: Current user data fetched: " + JSON.stringify(currentData));

      const newDailyXP = Math.min((currentData.dailyXP || 0) + xpEarned, rewardRules?.xpCap?.daily ?? 300);
      console.log("DailyChallenges: New daily XP: " + newDailyXP);
      const newDailyCoins = (currentData.dailyCoins || 0) + coinsEarned;
      console.log("DailyChallenges: New daily coins: " + newDailyCoins);
      const newTotalXP = (currentData.XP || 0) + xpEarned;
      console.log("DailyChallenges: New total XP: " + newTotalXP);
      const newTotalCoins = (currentData.coins || 0) + coinsEarned;
      console.log("DailyChallenges: New total coins: " + newTotalCoins);

      console.log("DailyChallenges: Updating user document with new XP and coins.");
      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        lastVideosCompletedAt: Timestamp.now(),
      });
      console.log("DailyChallenges: User data updated successfully in Firestore.");

      // Update local state
      setVideos((prev) => {
        console.log("DailyChallenges: Updating local 'videos' state to mark video as watched.");
        return prev.map((v) => (v.id === currentVideo.id ? { ...v, watched: true } : v));
      });
      setWatchedVideoIds((prev) => {
        console.log("DailyChallenges: Adding video ID to 'watchedVideoIds' state.");
        return [...prev, currentVideo.id];
      });

      // Trigger animations
      setEarnedPollXP(xpEarned);
      setEarnedPollCoins(coinsEarned);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);
      console.log("DailyChallenges: XP and Reward popup animations triggered.");

      setHasCompletedVideo(true);
      console.log("DailyChallenges: Has completed video state set to true.");
      console.log("DailyChallenges: 🎉 Video reward granted!");

    } catch (err: any) {
      console.error("DailyChallenges: 🚫 Failed to complete video:", err);
      Alert.alert(i18n.t('daily_challenge.error_completing_video_title'), i18n.t('daily_challenge.error_completing_video_message'));
    }
  }, [currentUserId, currentVideo, hasCompletedVideo, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  const onStateChange = useCallback((stateChange: string) => {
    console.log("DailyChallenges: Video player state changed to: " + stateChange);
    if (stateChange === "paused" || stateChange === "ended") {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("DailyChallenges: Video watch interval cleared.");
      }
      setPlaying(false);
      console.log("DailyChallenges: Video playing state set to false.");
    } else if (stateChange === "playing" && !watchInterval.current) {
      setPlaying(true);
      console.log("DailyChallenges: Video playing state set to true.");
      watchInterval.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current?.getCurrentTime?.();
          if (typeof currentTime !== 'number' || isNaN(currentTime)) return;
          console.log("DailyChallenges: Current video time: " + currentTime);

          const delta = currentTime - lastTimestampRef.current;

          if (delta > 0 && delta < 3) { // Only count forward playback, ignore jumps/rewinds
            totalWatchedRef.current += delta;
            console.log("DailyChallenges: Total watched time updated: " + totalWatchedRef.current);
          } else if (delta < 0) {
            console.log("DailyChallenges: Video rewind detected. Resetting last timestamp.");
            // If rewind, reset lastTimestampRef to current time to avoid large negative delta issues
            lastTimestampRef.current = currentTime;
          }

          lastTimestampRef.current = currentTime;

          if (videoDuration > 0) {
            const progress = (totalWatchedRef.current / videoDuration) * 100;
            setVideoProgress(progress);
            console.log("DailyChallenges: Video progress updated: " + progress.toFixed(2) + "%");

            if (progress >= (rewardRules?.videos?.watchPercentage || 80) && !hasCompletedVideo) {
              console.log("DailyChallenges: Video watch percentage reached. Triggering completion handler.");
              handleVideoCompletion();
            }
          }
        } catch (err) {
          console.warn("DailyChallenges: ⚠️ Tracker error:", err);
          if (watchInterval.current) {
            clearInterval(watchInterval.current);
            watchInterval.current = null;
            console.log("DailyChallenges: Error in video tracking, interval cleared.");
          }
        }
      }, 1000);
      console.log("DailyChallenges: Video watch interval started.");
    }
  }, [videoDuration, hasCompletedVideo, rewardRules, handleVideoCompletion]);

  const onReady = useCallback(async () => {
    console.log("DailyChallenges: Video player is ready.");
    if (!playerRef.current) return;

    try {
      const duration = await playerRef.current.getDuration();
      if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
        setVideoDuration(duration);
        console.log("DailyChallenges: Video duration set: " + duration);
      }
    } catch (error) {
      console.warn("DailyChallenges: Error getting video duration:", error);
    }
  }, []);

  const openVideoModal = useCallback((video: VideoItem) => {
    console.log("DailyChallenges: Opening video modal for video: " + video.id);
    setCurrentVideo(video);
    setVideoModalVisible(true);
    setHasCompletedVideo(false);
    setVideoProgress(0);
    totalWatchedRef.current = 0;
    lastTimestampRef.current = 0;
    
    if (watchInterval.current) {
      clearInterval(watchInterval.current);
      watchInterval.current = null;
      console.log("DailyChallenges: Existing video watch interval cleared before opening new modal.");
    }
  }, []);

  // DAILY RESET & STREAK MANAGEMENT
  const checkDailyReset = useCallback(async () => {
    console.log("DailyChallenges: checkDailyReset called.");
    if (!currentUserId) return;

    try {
      const userDocRef = doc(db, "users", currentUserId);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        console.log("DailyChallenges: User document not found during daily reset check.");
        return;
      }

      const data = userSnap.data();
      const lastActive = data.lastActiveDay?.toDate?.() || null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
        console.log("DailyChallenges: Different day detected or no lastActiveDay. Performing daily reset.");
        await updateDoc(userDocRef, {
          dailyXP: 0,
          dailyCoins: 0,
          bonusClaimed: false,
          lastActiveDay: Timestamp.fromDate(today),
        });
        console.log("DailyChallenges: Daily XP, Coins, Bonus Claimed reset in Firestore.");
        setDailyXP(0);
        setDailyCoins(0);
        setBonusClaimed(false);
        setStreakCheckedToday(false); // Mark for streak update on next XP gain
        console.log("DailyChallenges: Local daily XP, Coins, Bonus Claimed, StreakCheckedToday reset.");
      } else {
        setStreakCheckedToday(true);
        console.log("DailyChallenges: Same day detected. Streak already checked today.");
      }
    } catch (err) {
      console.error("DailyChallenges: checkDailyReset error:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_daily_reset_check'));
    }
  }, [currentUserId, db]);

  const updateStreakOnXPEarned = useCallback(async (xpAmount: number, currentStreakVal: number, lastActiveDayVal: Timestamp | null) => {
    console.log("DailyChallenges: updateStreakOnXPEarned called with XP: " + xpAmount + ", Current Streak: " + currentStreakVal);
    if (!currentUserId) return;

    try {
      const userDocRef = doc(db, "users", currentUserId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActive = lastActiveDayVal?.toDate?.();
      lastActive?.setHours(0, 0, 0, 0);

      let newStreak = currentStreakVal;
      const threshold = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
      console.log("DailyChallenges: Streak update threshold: " + threshold + " XP.");

      if (!lastActive) {
        // First time user - start streak if XP threshold met
        newStreak = xpAmount >= threshold ? 1 : 0;
        console.log("DailyChallenges: First activity detected. New streak: " + newStreak + " (XP met threshold: " + (xpAmount >= threshold) + ")");
      } else {
        const diff = today.getTime() - lastActive.getTime();
        const daysSinceLastActive = Math.round(diff / (1000 * 60 * 60 * 24));
        console.log("DailyChallenges: Days since last active: " + daysSinceLastActive);

        if (daysSinceLastActive === 0) {
          // Same day - no streak change, just check if today's XP target is met
          console.log("DailyChallenges: Streak update skipped: Same day. Current streak remains: " + currentStreakVal);
          return; // Don't update streak for same day
        } else if (daysSinceLastActive === 1) {
          // Yesterday was last active - normal progression/regression
          if (xpAmount >= threshold) {
            // Met today's XP target - continue/increase streak
            newStreak = Math.min(currentStreakVal + 1, 7); // Increase streak, cap at 7
            console.log("DailyChallenges: Met XP target for yesterday. New streak: " + newStreak);
          } else {
            // Didn't meet today's XP target - lose 1 streak
            newStreak = Math.max(currentStreakVal - 1, 0); // Lose 1 streak, minimum 0
            console.log("DailyChallenges: Did NOT meet XP target for yesterday. New streak: " + newStreak);
          }
        } else {
          // 2+ days missed - reset to 0
          if (xpAmount >= threshold) {
            newStreak = 1; // Start fresh with 1 if they meet XP target today
            console.log("DailyChallenges: Missed 2+ days but met XP target today. New streak: " + newStreak);
          } else {
            newStreak = 0; // Stay at 0 if they don't meet XP target
            console.log("DailyChallenges: Missed 2+ days and did NOT meet XP target today. New streak: " + newStreak);
          }
        }
      }

      // Update the highest streak if current streak is higher
      const lastHighestStreak = Math.max(userData.lastHighestStreak || 0, newStreak);
      console.log("DailyChallenges: Old highest streak: " + (userData.lastHighestStreak || 0) + ", New highest streak: " + lastHighestStreak);

      await updateDoc(userDocRef, {
        streakToday: newStreak,
        lastHighestStreak,
        lastActiveDay: Timestamp.fromDate(today),
      });
      console.log(`DailyChallenges: 📊 Streak updated: ${currentStreakVal} -> ${newStreak} (Highest: ${lastHighestStreak})`);

    } catch (error) {
      console.error("DailyChallenges: Error updating streak:", error);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_updating_streak_message'));
    }
  }, [currentUserId, db, userData.lastHighestStreak, rewardRules]);

  //  test function after your existing functions (around line 400, after recoverStreak function)

  const testStreakLogic = useCallback(async (daysMissed: number, currentXP: number) => {
    console.log("DailyChallenges: 🧪 TESTING: testStreakLogic triggered.");
    if (!currentUserId) return;

    try {
      const userDocRef = doc(db, "users", currentUserId);

      // Simulate different lastActiveDay scenarios
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - daysMissed); // Go back X days
      testDate.setHours(0, 0, 0, 0);

      console.log(`DailyChallenges: 📊 TESTING: ${daysMissed} days missed, ${currentXP} XP earned today`);
      console.log(`DailyChallenges: 📊 Simulating lastActiveDay: ${testDate.toDateString()}`);
      console.log(`DailyChallenges: 📊 Current streak before test: ${userData.streakToday}`);

      // Call your streak update function with test data
      await updateStreakOnXPEarned(
        currentXP,
        userData.streakToday,
        Timestamp.fromDate(testDate)
      );

      console.log("DailyChallenges: 🧪 TEST completed. Check your streak in the UI!");

    } catch (error) {
      console.error("DailyChallenges: Test error:", error);
    }
  }, [currentUserId, userData.streakToday, updateStreakOnXPEarned, db]);

  // POLL HANDLING
  const handleVote = useCallback(async (pollId: string, choice: string) => {
    console.log("DailyChallenges: handleVote triggered for pollId: " + pollId + ", choice: " + choice);
    if (!ensureAuthenticated() || !currentUserId) return;

    const currentPoll = polls.find(p => p.id === pollId);
    if (currentPoll?.voted) {
      console.log("DailyChallenges: Poll already voted. Returning.");
      Alert.alert(i18n.t('daily_challenge.already_voted_title'), i18n.t('daily_challenge.already_voted_message'));
      setPolls(prevPolls => prevPolls.map(p => p.id === pollId ? { ...p, voted: true, selectedChoice: choice } : p));
      return;
    }

    const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
    console.log("DailyChallenges: Multiplier for poll vote: " + streakMultiplier + " (streak: " + userData.streakToday + ")");
    const rewardXP = Math.round((rewardRules?.polls?.xpPerPoll ?? 30) * streakMultiplier);
    console.log("DailyChallenges: XP earned for poll: " + rewardXP);
    const rewardCoins = Math.round((rewardRules?.polls?.coinsPerPoll ?? 50) * streakMultiplier);
    console.log("DailyChallenges: Coins earned for poll: " + rewardCoins);

    const userDocRef = doc(db, "users", currentUserId);
    const pollHistoryDocRef = doc(db, "users", currentUserId, "pollHistory", pollId);

    try {
      console.log("DailyChallenges: Checking if poll was already voted (server-side check). Poll ID: " + pollId);
      const pollHistorySnapshot = await getDoc(pollHistoryDocRef);
      if (pollHistorySnapshot.exists()) {
        console.log("DailyChallenges: Poll already voted on server. No reward.");
        Alert.alert(i18n.t('daily_challenge.already_voted_title'), i18n.t('daily_challenge.already_voted_message'));
        setPolls(prevPolls => prevPolls.map(p => p.id === pollId ? { ...p, voted: true, selectedChoice: choice } : p));
        return;
      }

      console.log("DailyChallenges: Recording poll vote.");
      await setDoc(pollHistoryDocRef, {
        selectedChoice: choice,
        votedAt: Timestamp.now(),
      });
      console.log("DailyChallenges: Poll vote recorded successfully in Firestore.");

      console.log("DailyChallenges: Fetching user data for reward update.");
      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();

      console.log("DailyChallenges: Calculating new daily and total XP/Coins for poll vote.");
      const newDailyXP = Math.min((currentData?.dailyXP || 0) + rewardXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData?.dailyCoins || 0) + rewardCoins;
      const newTotalXP = (currentData?.XP || 0) + rewardXP;
      const newTotalCoins = (currentData?.coins || 0) + rewardCoins;

      console.log("DailyChallenges: Updating user document with new XP and coins from poll.");
      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
      });
      console.log("DailyChallenges: User data updated successfully for poll vote.");

      setEarnedPollXP(rewardXP);
      setEarnedPollCoins(rewardCoins);
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      console.log("DailyChallenges: Poll vote XP and Reward popup animations triggered.");

      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);

      setPolls(prevPolls => {
        const updatedPolls = prevPolls.map((poll) =>
          poll.id === pollId ? { ...poll, voted: true, selectedChoice: choice } : poll
        );
        console.log("DailyChallenges: Local 'polls' state updated after vote.");

        const allVoted = updatedPolls.every((p) => p.voted);
        if (allVoted) {
          console.log("DailyChallenges: All daily polls completed. Updating lastPollsCompletedAt.");
          updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() })
            .catch((err) => console.error("DailyChallenges: 🚫 Error updating lastPollsCompletedAt:", err));
        }
        console.log("DailyChallenges: All polls voted status: " + allVoted);
        return updatedPolls;
      });

    } catch (err) {
      console.error("DailyChallenges: 🚫 handleVote error:", err);
      Alert.alert(i18n.t('daily_challenge.error_submitting_vote'), i18n.t('daily_challenge.error_submitting_vote_message'));
    }
  }, [currentUserId, polls, rewardRules, userData.streakToday, db, ensureAuthenticated]);

  // STREAK RECOVERY
  const recoverStreak = useCallback(async () => {
    console.log("DailyChallenges: recoverStreak called.");
    if (!ensureAuthenticated() || !currentUserId) return;

    try {
      const userDocRef = doc(db, "users", currentUserId);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        console.log("DailyChallenges: User document not found for streak recovery.");
        return;
      }

      const data = userSnap.data();
      const isVIP = data.vip === true;
      console.log("DailyChallenges: User VIP status: " + isVIP);
      const userCoins = data.coins || 0;
      const cost = rewardRules?.streakRecovery?.coinsCost || 5000;
      console.log("DailyChallenges: Streak recovery cost: " + cost + " coins. User coins: " + userCoins);

      if (isVIP) {
        let canUseFree = true;
        const vipUsed = data.vipStreakRecoveryUsed || 0;
        const vipResetAt = data.vipRecoveryResetAt?.toDate?.() || null;
        const now = new Date();
        console.log("DailyChallenges: VIP recovery check. Used: " + vipUsed + ", Reset At: " + vipResetAt);

        if (vipResetAt && now < vipResetAt && vipUsed >= (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          canUseFree = false;
          console.log("DailyChallenges: VIP free recovery limit reached for current period.");
        }

        if (vipResetAt && now > vipResetAt) {
          console.log("DailyChallenges: VIP recovery reset period passed. Resetting used count.");
          await updateDoc(userDocRef, { vipStreakRecoveryUsed: 0 });
          canUseFree = true;
        }

        if (canUseFree && vipUsed < (rewardRules?.streakRecovery?.vipMaxUses || 2)) {
          console.log("DailyChallenges: VIP free streak recovery available. Applying.");
          await updateDoc(userDocRef, {
            streakToday: 7,
            lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
            lastStreakRecoveryUsed: Timestamp.fromDate(now),
            vipStreakRecoveryUsed: vipUsed + 1,
            vipRecoveryResetAt: Timestamp.fromDate(new Date(now.getTime() + (rewardRules?.streakRecovery?.vipCooldownDays || 7) * 24 * 60 * 60 * 1000)),
          });
          setCanRecoverStreak(false);
          Alert.alert(i18n.t('daily_challenge.vip_recovery_alert_title'), i18n.t('daily_challenge.vip_recovery_alert_message'));
          console.log("DailyChallenges: VIP streak recovered for free.");
          return;
        }
      }

      if (userCoins < cost) {
        console.log("DailyChallenges: Not enough coins to recover streak. Required: " + cost + ", User has: " + userCoins);
        Alert.alert(i18n.t('daily_challenge.not_enough_coins_title'), i18n.t('daily_challenge.not_enough_coins_message', { cost }));
        return;
      }

      console.log("DailyChallenges: Recovering streak by spending coins.");
      await updateDoc(userDocRef, {
        coins: userCoins - cost,
        streakToday: 7,
        lastHighestStreak: Math.max(data.lastHighestStreak || 0, 7),
        lastStreakRecoveryUsed: Timestamp.fromDate(now),
      });
      console.log("DailyChallenges: Streak recovered by spending coins.");

      setCanRecoverStreak(false);
      Alert.alert(i18n.t('daily_challenge.streak_recovered_alert_title'), i18n.t('daily_challenge.streak_recovered_alert_message', { cost }));
    } catch (err) {
      console.error("DailyChallenges: 🚫 Failed to recover streak:", err);
      Alert.alert(i18n.t('daily_challenge.error_recovering_streak_title'), i18n.t('daily_challenge.error_recovering_streak_message'));
    }
  }, [currentUserId, rewardRules, db, ensureAuthenticated]);

  // BONUS CHEST
  const handleClaimBonus = useCallback(async () => {
    console.log("DailyChallenges: handleClaimBonus triggered.");
    if (!ensureAuthenticated() || !currentUserId || bonusClaimed) return;

    const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
    console.log("DailyChallenges: Required daily XP for bonus chest: " + requiredXP + ". Current daily XP: " + dailyXP);
    if (dailyXP < requiredXP) {
      Alert.alert(i18n.t('daily_challenge.bonus_not_ready_title'), i18n.t('daily_challenge.bonus_not_ready_message', { xpNeeded: requiredXP }));
      console.log("DailyChallenges: Bonus chest not ready. Daily XP (" + dailyXP + ") is less than required (" + requiredXP + ").");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUserId);
      const streakMultiplier = userData.streakToday === 7 ? 1.5 : 1;
      console.log("DailyChallenges: Multiplier for bonus chest: " + streakMultiplier + " (streak: " + userData.streakToday + ")");
      const chestXP = Math.round((rewardRules?.bonusChest?.xp ?? 30) * streakMultiplier);
      console.log("DailyChallenges: XP from bonus chest: " + chestXP);
      const chestCoins = Math.round((rewardRules?.bonusChest?.coins ?? 200) * streakMultiplier);
      console.log("DailyChallenges: Coins from bonus chest: " + chestCoins);

      console.log("DailyChallenges: Fetching user data for bonus claim.");
      const userSnap = await getDoc(userDocRef);
      const currentData = userSnap.data();
      if (!currentData) throw new Error("User data not found for bonus claim.");
      console.log("DailyChallenges: Current user data for bonus claim: " + JSON.stringify(currentData));

      console.log("DailyChallenges: Calculating new daily and total XP/Coins from bonus.");
      const newDailyXP = Math.min((currentData.dailyXP || 0) + chestXP, rewardRules?.xpCap?.daily ?? 300);
      const newDailyCoins = (currentData.dailyCoins || 0) + chestCoins;
      const newTotalXP = (currentData.XP || 0) + chestXP;
      const newTotalCoins = (currentData.coins || 0) + chestCoins;

      console.log("DailyChallenges: Updating user document after bonus claim.");
      await updateDoc(userDocRef, {
        dailyXP: newDailyXP,
        dailyCoins: newDailyCoins,
        XP: newTotalXP,
        coins: newTotalCoins,
        bonusClaimed: true,
      });
      console.log("DailyChallenges: User data updated successfully after bonus claim.");

      setBonusClaimed(true);
      console.log("DailyChallenges: BonusClaimed state set to true.");

      sparkleAnim.setValue(0);
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();
      console.log("DailyChallenges: Sparkle animation started.");

      setEarnedPollXP(chestXP); // Reusing for bonus chest XP display
      setEarnedPollCoins(chestCoins); // Reusing for bonus chest Coins display
      setShowXPAnimation(true);
      setRewardPopupVisible(true);
      console.log("DailyChallenges: Bonus chest XP and Reward popup animations triggered.");

      setTimeout(() => setShowXPAnimation(false), 1500);
      setTimeout(() => setRewardPopupVisible(false), 2000);

    } catch (err) {
      console.error("DailyChallenges: Bonus claim failed:", err);
      Alert.alert(i18n.t('daily_challenge.bonus_claim_failed_title'), i18n.t('daily_challenge.bonus_claim_failed_message'));
    }
  }, [currentUserId, bonusClaimed, dailyXP, rewardRules, userData.streakToday, db, ensureAuthenticated, sparkleAnim]);

  // DATA FETCHING
  const fetchDailyPolls = useCallback(async () => {
    console.log("DailyChallenges: fetchDailyPolls called.");
    if (!ensureAuthenticated() || !currentUserId) return;

    try {
      setPollsLoaded(false);
      console.log("DailyChallenges: pollsLoaded set to false (loading polls).");
      
      const userDocRef = doc(db, "users", currentUserId);
      const userSnapshot = await getDoc(userDocRef);
      const docData = userSnapshot.data();
      const lastCompleted = docData?.lastPollsCompletedAt?.toDate?.() || null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastCompleted && lastCompleted.toDateString() === today.toDateString()) {
        console.log("DailyChallenges: Polls already completed today. Setting polls to empty.");
        setPolls([]);
        setPollsLoaded(true);
        return;
      }

      const pollsRef = collection(db, "polls");
      const activeQuery = query(pollsRef, where("active", "==", true));
      const pollsSnapshot = await getDocs(activeQuery);
      const activePolls = pollsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      console.log("DailyChallenges: Active polls fetched: " + activePolls.length);

      const pollHistoryRef = collection(db, "users", currentUserId, "pollHistory");
      const historySnapshot = await getDocs(pollHistoryRef);
      const seenPollIds = historySnapshot.docs.map((d) => d.id);
      setPollsLoaded(true);
      console.log("DailyChallenges: Poll history fetched. Seen poll IDs: " + JSON.stringify(seenPollIds));


      const unseenPolls = activePolls.filter((p) => !seenPollIds.includes(p.id));
      console.log("DailyChallenges: Unseen polls found: " + unseenPolls.length);

      if (unseenPolls.length === 0) {
        console.log("DailyChallenges: No unseen polls available. Marking all polls completed for today.");
        await updateDoc(userDocRef, { lastPollsCompletedAt: Timestamp.now() });
        setPolls([]);
      } else {
        // Shuffle and select polls
        for (let i = unseenPolls.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenPolls[i], unseenPolls[j]] = [unseenPolls[j], unseenPolls[i]];
        }
        const selectedPolls = unseenPolls.slice(0, 2);
        console.log("DailyChallenges: Selected " + selectedPolls.length + " polls for today.");
        setPolls(selectedPolls.map((p) => ({ ...p, voted: false })));
      }
    } catch (err) {
      console.error("DailyChallenges: Error fetching polls:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_polls_message'));
    } finally {
      setPollsLoaded(true);
      console.log("DailyChallenges: Polls loading process finished.");
    }
  }, [currentUserId, db, ensureAuthenticated]);

  const fetchDailyVideos = useCallback(async () => {
    console.log("DailyChallenges: fetchDailyVideos called.");
    if (!ensureAuthenticated() || !currentUserId) return;

    try {
      setVideosLoaded(false);
      console.log("DailyChallenges: videosLoaded set to false (loading videos).");
      
      const videosRef = ref(rtdb, "dailychallengevideos");
      const snap = await get(videosRef);
      if (!snap.exists()) {
        console.log("DailyChallenges: No daily challenge videos found in RTDB.");
        setVideos([]);
        setVideosLoaded(true);
        return;
      }

      const data = snap.val();
      const allVideos = Object.keys(data).map((key) => ({
        id: key,
        title: data[key].title,
        thumbnailUrl: data[key].thumbnail_url,
        youtubeUrl: data[key].video_url,
        rewardXP: data[key].rewardXP || rewardRules?.videos?.xpPerVideo || 50,
        rewardCoins: data[key].rewardCoins || rewardRules?.videos?.coinsPerVideo || 100,
        watched: false, // Default to false, will update based on history
      })) as VideoItem[];
      console.log("DailyChallenges: All videos fetched from RTDB: " + allVideos.length);

      const videoHistoryRef = collection(db, "users", currentUserId, "watchedVideos");
      const historySnap = await getDocs(videoHistoryRef);
      const seenVideoIds = historySnap.docs.map((d) => d.id);
      setWatchedVideoIds(seenVideoIds);
      console.log("DailyChallenges: Watched video history fetched. Seen video IDs: " + JSON.stringify(seenVideoIds));

      const unseenVideos = allVideos.filter((v) => !seenVideoIds.includes(v.id));
      console.log("DailyChallenges: Unseen videos found: " + unseenVideos.length);

      if (unseenVideos.length === 0) {
        console.log("DailyChallenges: No unseen videos available. Setting videos to empty.");
        setVideos([]);
      } else {
        // Shuffle and select videos
        for (let i = unseenVideos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unseenVideos[i], unseenVideos[j]] = [unseenVideos[j], unseenVideos[i]];
        }
        const selectedVideos = unseenVideos.slice(0, 2);
        console.log("DailyChallenges: Selected " + selectedVideos.length + " videos for today.");
        setVideos(selectedVideos.map((v) => ({ ...v, watched: seenVideoIds.includes(v.id) })));
      }
    } catch (err) {
      console.error("DailyChallenges: Error fetching videos:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_videos_message'));
    } finally {
      setVideosLoaded(true);
      console.log("DailyChallenges: Videos loading process finished.");
    }
  }, [currentUserId, rewardRules, db, rtdb, ensureAuthenticated]);

  const checkAndHandleMonthlyReset = useCallback(async () => {
    console.log("DailyChallenges: checkAndHandleMonthlyReset called.");
    if (!currentUserId) return;

    try {
      const userDocRef = doc(db, "users", currentUserId);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        console.log("DailyChallenges: User document not found for monthly reset check.");
        return;
      }

      const data = userSnap.data();
      const lastResetAt: Timestamp | null = data.lastResetAt || null;
      const now = Timestamp.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (!lastResetAt || now.toMillis() - lastResetAt.toMillis() > thirtyDays) {
        console.log("DailyChallenges: Performing monthly reset...");
        
        // Clear poll and video history (simple approach)
        const pollHistoryRef = collection(db, "users", currentUserId, "pollHistory");
        const videoHistoryRef = collection(db, "users", currentUserId, "watchedVideos");

        console.log("DailyChallenges: Fetching poll and video history for deletion.");
        const [pollSnapshot, videoSnapshot] = await Promise.all([
          getDocs(pollHistoryRef),
          getDocs(videoHistoryRef)
        ]);

        console.log("DailyChallenges: Deleting old poll and video history documents.");
        const deletePromises = [
          ...pollSnapshot.docs.map(doc => deleteDoc(doc.ref)),
          ...videoSnapshot.docs.map(doc => deleteDoc(doc.ref))
        ];

        await Promise.all(deletePromises);
        console.log("DailyChallenges: Old poll and video history cleared.");
        await updateDoc(userDocRef, { lastResetAt: now });
        console.log("DailyChallenges: Monthly reset timestamp updated in Firestore.");

        // Re-fetch data after reset
        fetchDailyPolls();
        fetchDailyVideos();
        console.log("DailyChallenges: Re-fetching daily polls and videos after monthly reset.");
      }
    } catch (err) {
      console.error("DailyChallenges: Error handling monthly reset:", err);
      Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_monthly_reset_check'));
    } finally {
      setMonthlyResetChecked(true);
      console.log("DailyChallenges: Monthly reset check finished.");
    }
  }, [currentUserId, db, fetchDailyPolls, fetchDailyVideos]);


  // EFFECTS

  useEffect(() => {
    console.log("DailyChallenges: useEffect (Streak Check) triggered.");
    if (currentUserId && userData.lastActiveDay !== null && !streakCheckedToday && rewardRules) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActive = new Date(userData.lastActiveDay.toDate());
      lastActive.setHours(0, 0, 0, 0);

      const sameDay = today.toDateString() === lastActive.toDateString();

      if (!sameDay) {
        console.log("DailyChallenges: Streak Check Effect: Different day, triggering streak update.");
        updateStreakOnXPEarned(dailyXP, userData.streakToday, userData.lastActiveDay).then(() => {
          setStreakCheckedToday(true);
          console.log("DailyChallenges: Streak checked today state set to true.");
        });
      } else {
        setStreakCheckedToday(true);
        console.log("DailyChallenges: Streak Check Effect: Same day, marking streak as checked.");
      }
    }
  }, [dailyXP, userData.lastActiveDay, userData.streakToday, currentUserId, streakCheckedToday, rewardRules, updateStreakOnXPEarned]);

  // 1. Auth state observer
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Auth State Observer) triggered.");
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUserId(user.uid);
        console.log("DailyChallenges: Auth State Changed: User logged in. UID: " + user.uid);
      } else {
        setCurrentUserId(null);
        console.log("DailyChallenges: Auth State Changed: User logged out. Redirecting to login.");
        router.replace('/login');
      }
      setIsAuthLoading(false);
      console.log("DailyChallenges: Auth loading state set to false.");
    });
    return () => {
      unsubscribe();
      console.log("DailyChallenges: Auth state observer unsubscribed.");
    };
  }, [router]);

  // 2. Initialize user data
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Initialize User Data) triggered.");
    const initializeUserData = async () => {
      console.log("DailyChallenges: initializeUserData function called.");
      if (!ensureAuthenticated() || !currentUserId) return;

      try {
        const userDocRef = doc(db, "users", currentUserId);
        console.log("DailyChallenges: Fetching user document to initialize data.");
        const snapshot = await getDoc(userDocRef);

        if (!snapshot.exists()) {
          console.log("DailyChallenges: User document does not exist. Creating new user data.");
          await setDoc(userDocRef, {
            dailyXP: 0,
            dailyCoins: 0,
            streakToday: 0,
            lastHighestStreak: 0,
            coins: 0,
            XP: 0,
            bonusClaimed: false,
            lastActiveDay: Timestamp.now(),
            lastStreakRecoveryUsed: null,
            vip: false,
            vipStreakRecoveryUsed: 0,
            vipRecoveryResetAt: null,
            lastResetAt: Timestamp.now(),
          });
          console.log("DailyChallenges: New user document created with default values.");
        } else {
          console.log("DailyChallenges: User document exists. Checking for missing fields.");
          const data = snapshot.data();
          const updates: any = {};
          
          const requiredFields = {
            dailyXP: 0,
            dailyCoins: 0,
            streakToday: 0,
            lastHighestStreak: 0,
            coins: 0,
            XP: 0,
            bonusClaimed: false,
            lastActiveDay: Timestamp.now(),
            lastStreakRecoveryUsed: null,
            vip: false,
            vipStreakRecoveryUsed: 0,
            vipRecoveryResetAt: null,
            lastResetAt: Timestamp.now(),
          };

          Object.entries(requiredFields).forEach(([field, defaultValue]) => {
            if (!Object.prototype.hasOwnProperty.call(data, field)) {
              updates[field] = defaultValue;
              console.log(`DailyChallenges: Missing field '${field}' detected. Adding with default value.`);
            }
          });

          if (Object.keys(updates).length > 0) {
            console.log("DailyChallenges: Updating user document with missing fields: " + JSON.stringify(updates));
            await updateDoc(userDocRef, updates);
          }
        }
      } catch (error) {
        console.error("DailyChallenges: Error initializing user data:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_initializing_user_data_message'));
      }
    };

    if (currentUserId) {
      console.log("DailyChallenges: currentUserId available, initializing user data.");
      initializeUserData();
    }
  }, [currentUserId, db, ensureAuthenticated]);

  // 3. Real-time listener for user data
  useEffect(() => {
    console.log("DailyChallenges: useEffect (User Data Listener) triggered.");
    if (!currentUserId) return;

    const userDocRef = doc(db, "users", currentUserId);
    console.log("DailyChallenges: Setting up real-time listener for user data.");
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("DailyChallenges: User data snapshot received: " + JSON.stringify(data));
          
          // Update daily progress
          setDailyXP(data.dailyXP ?? 0);
          setDailyCoins(data.dailyCoins ?? 0);
          setBonusClaimed(data.bonusClaimed ?? false);
          console.log("DailyChallenges: Daily progress states updated.");

          // Update user data
          setUserData((prev: any) => ({
            ...prev,
            streakToday: data.streakToday ?? 0,
            lastHighestStreak: data.lastHighestStreak ?? 0,
            coins: data.coins ?? 0,
            XP: data.XP ?? 0,
            lastActiveDay: data.lastActiveDay ?? null,
            lastStreakRecoveryUsed: data.lastStreakRecoveryUsed ?? null,
            vip: data.vip ?? false,
            vipStreakRecoveryUsed: data.vipStreakRecoveryUsed ?? 0,
            vipRecoveryResetAt: data.vipRecoveryResetAt ?? null,
          }));
          console.log("DailyChallenges: userData state updated from snapshot.");

          // Update streak recovery availability
          const isVIP = data.vip ?? false;
          if (isVIP) {
            const vipUsed = data.vipStreakRecoveryUsed || 0;
            const resetAt = data.vipRecoveryResetAt?.toDate?.() || null;
            const now = new Date();
            console.log("DailyChallenges: VIP user detected. Checking streak recovery availability.");

            if (!resetAt || now > resetAt) {
              setCanRecoverStreak(true);
              console.log("DailyChallenges: VIP recovery reset time passed or not set. Can recover streak.");
            } else {
              setCanRecoverStreak(vipUsed < (rewardRules?.streakRecovery?.vipMaxUses || 2));
              console.log("DailyChallenges: VIP recovery count: " + vipUsed + ". Can recover streak: " + (vipUsed < (rewardRules?.streakRecovery?.vipMaxUses || 2)));
            }
          } else {
            setCanRecoverStreak(true); // Non-VIP can always recover if they have coins
            console.log("DailyChallenges: Non-VIP user. Can recover streak.");
          }
        }
      },
      (error) => {
        console.error("DailyChallenges: Error listening to user data:", error);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_user_data_message'));
      }
    );
    return () => {
      unsubscribe();
      console.log("DailyChallenges: User data listener unsubscribed.");
    };
  }, [currentUserId, db]);

  // 4. Daily reset check
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Daily Reset Check) triggered.");
    if (currentUserId) {
      checkDailyReset();
      console.log("DailyChallenges: checkDailyReset called in useEffect.");
    }
  }, [currentUserId, checkDailyReset]);

  // 5. Timer for daily reset
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Daily Reset Timer) triggered.");
    const interval = setInterval(() => {
      const newTimeLeft = getTimeUntilMidnight();
      setTimeLeft(newTimeLeft);
      console.log("DailyChallenges: Timer updated. Time left until midnight: " + newTimeLeft);
      
      if (newTimeLeft <= 1000 && newTimeLeft > -1000 && currentUserId) {
        console.log("DailyChallenges: Midnight approaching. Triggering daily reset check.");
        checkDailyReset();
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      console.log("DailyChallenges: Daily reset timer interval cleared.");
    };
  }, [currentUserId, checkDailyReset]);

  // 6. Monthly reset check
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Monthly Reset Check) triggered.");
    if (currentUserId && !monthlyResetChecked) {
      checkAndHandleMonthlyReset();
      console.log("DailyChallenges: checkAndHandleMonthlyReset called in useEffect.");
    }
  }, [currentUserId, monthlyResetChecked, checkAndHandleMonthlyReset]);

  // 7. Fetch reward rules
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Fetch Reward Rules) triggered.");
    const fetchRewardRules = async () => {
      console.log("DailyChallenges: fetchRewardRules function called.");
      if (!currentUserId) return;
      
      try {
        setRewardRulesLoading(true);
        console.log("DailyChallenges: rewardRulesLoading set to true.");
        const rewardDocRef = doc(db, "config", "rewardRules");
        console.log("DailyChallenges: Fetching reward rules document.");
        const rewardSnap = await getDoc(rewardDocRef);
        
        if (rewardSnap.exists()) {
          setRewardRules(rewardSnap.data());
          console.log("DailyChallenges: Reward rules fetched successfully: " + JSON.stringify(rewardSnap.data()));
        } else {
          // Default values
          const defaultRules = {
            polls: { xpPerPoll: 30, coinsPerPoll: 50 },
            videos: { xpPerVideo: 50, coinsPerVideo: 100, watchPercentage: 80 },
            community: { meaningfulPostXP: 30, likesCoins: 50, repliesXP: 20, commentsCoins: 15 },
            bonusChest: { requiredDailyXP: 150, xp: 30, coins: 200 },
            xpCap: { daily: 500 },
            coinsCap: { daily: 1500 },
            streakRecovery: { coinsCost: 5000, vipMaxUses: 2, vipCooldownDays: 7 }
          };
          setRewardRules(defaultRules);
          console.log("DailyChallenges: Reward rules not found, setting default rules: " + JSON.stringify(defaultRules));
        }
      } catch (err) {
        console.error("DailyChallenges: Error fetching rewardRules:", err);
        Alert.alert(i18n.t('global.error'), i18n.t('daily_challenge.error_fetching_reward_rules_message'));
      } finally {
        setRewardRulesLoading(false);
        console.log("DailyChallenges: rewardRulesLoading set to false.");
      }
    };

    if (currentUserId) {
      console.log("DailyChallenges: currentUserId available, fetching reward rules.");
      fetchRewardRules();
    }
  }, [currentUserId, db]);

  // 8. Bonus chest animation
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Bonus Chest Animation) triggered.");
    if (!rewardRules) return;
    
    const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
    if (dailyXP >= requiredXP && !bonusClaimed) {
      console.log("DailyChallenges: Bonus chest ready! Starting chest animation loop.");
      Animated.loop(
        Animated.sequence([
          Animated.timing(chestAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(chestAnimation, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      console.log("DailyChallenges: Bonus chest not ready or already claimed. Stopping chest animation.");
      chestAnimation.stopAnimation();
      chestAnimation.setValue(0);
    }
  }, [dailyXP, bonusClaimed, rewardRules, chestAnimation]);

  // 9. Fetch polls and videos after setup
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Fetch Polls & Videos) triggered.");
    if (currentUserId && monthlyResetChecked && rewardRules && !rewardRulesLoading) {
      console.log("DailyChallenges: All prerequisites met. Fetching daily polls and videos.");
      fetchDailyPolls();
      fetchDailyVideos();
    }
  }, [currentUserId, monthlyResetChecked, rewardRules, rewardRulesLoading, fetchDailyPolls, fetchDailyVideos]);

  // 10. App state listener for video playback
  useEffect(() => {
    console.log("DailyChallenges: useEffect (App State Listener) triggered.");
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      console.log("DailyChallenges: App state changed to: " + nextAppState);
      if (nextAppState === "active" && videoModalVisible && playerRef.current && playing) {
        try {
          const currentTime = await playerRef.current.getCurrentTime?.();
          if (typeof currentTime === 'number' && !isNaN(currentTime)) {
            lastTimestampRef.current = currentTime;
            console.log("DailyChallenges: App became active. Resetting video timestamp for tracking.");
            if (!watchInterval.current) {
              onStateChange("playing"); // Resume interval if it was stopped
              console.log("DailyChallenges: App active, video modal visible. Resuming video tracking.");
            }
          }
        } catch (err) {
          console.warn("DailyChallenges: Error getting current time on app state change:", err);
        }
      } else if (nextAppState !== "active" && watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("DailyChallenges: App moved to background/inactive. Video watch interval cleared.");
      }
    });

    return () => {
      subscription.remove();
      console.log("DailyChallenges: App state listener unsubscribed.");
    };
  }, [videoModalVisible, playing, onStateChange]);

  // 11. Cleanup for video interval
  useEffect(() => {
    console.log("DailyChallenges: useEffect (Video Interval Cleanup) triggered.");
    return () => {
      if (watchInterval.current) {
        clearInterval(watchInterval.current);
        watchInterval.current = null;
        console.log("DailyChallenges: Cleanup: Video watch interval cleared.");
      }
    };
  }, []);

  // RENDER
  if (isAuthLoading || rewardRulesLoading) {
    console.log("DailyChallenges: Rendering loading state. isAuthLoading: " + isAuthLoading + ", rewardRulesLoading: " + rewardRulesLoading);
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF9D" />
        <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading_config')}</Text>
      </View>
    );
  }

  const targetXP = rewardRules?.xpCap?.daily ?? 500;
  const targetCoins = rewardRules?.coinsCap?.daily ?? 1500;
  console.log("DailyChallenges: Render. Target XP: " + targetXP + ", Target Coins: " + targetCoins);

  return (
    <ImageBackground
      source={require("../../../assets/images/bg20.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Daily Streak Section */}
        <StreakDisplay
          streakToday={userData.streakToday}
          dailyXP={dailyXP}
          vip={userData.vip}
          vipStreakRecoveryUsed={userData.vipStreakRecoveryUsed}
          canRecoverStreak={canRecoverStreak}
          recoverStreak={recoverStreak}
          rewardRules={rewardRules}
          userCoins={userData.coins}
        />

        {/* Reset Timer Section */}
        <ResetTimerDisplay
          timeLeft={timeLeft}
          formatTime={formatTime}
        />

        {/* Tabs Navigation */}
        <TabsNavigation
          activeTab={activeTab}
          setActiveTab={(tab) => {
            console.log("DailyChallenges: Tab navigation changed to: " + tab);
            setActiveTab(tab);
          }}
        />

        {/* Polls Tab Content */}
        {activeTab === "polls" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('daily_challenge.poll_section_title')}</Text>
            {!pollsLoaded ? (
              <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading_polls')}</Text>
            ) : polls.length === 0 ? (
              <View style={styles.pollCompletionCard}>
                <Text style={styles.pollCompleteTitle}>{i18n.t('daily_challenge.poll_completed_title')}</Text>
                <Text style={styles.pollCompleteMessage}>
                  {i18n.t('daily_challenge.poll_completed_message')}
                </Text>
              </View>
            ) : (
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={handleVote}
                />
              ))
            )}
          </View>
        )}


        {/* TEMPORARY TEST BUTTONS - REMOVE AFTER TESTING */}
        {__DEV__ && (
          <View style={{ padding: 20, backgroundColor: 'rgba(255,0,0,0.3)', margin: 10 }}>
            <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>
              🧪 STREAK TESTING (DEV ONLY)
            </Text>
            <Text style={{ color: 'white', fontSize: 12, marginBottom: 10 }}>
              Current: {userData.streakToday} | Highest: {userData.lastHighestStreak} | Daily XP: {dailyXP}
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#ff6b6b', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenges: Test button pressed: Miss 1 day + Meet XP.");
                testStreakLogic(1, 200); // Miss 1 day, meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 1 Day + Meet XP (should +1 streak)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#ffa502', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenges: Test button pressed: Miss 1 day + Low XP.");
                testStreakLogic(1, 50); // Miss 1 day, don't meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 1 Day + Low XP (should -1 streak)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#2ed573', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenges: Test button pressed: Miss 3 days + Meet XP.");
                testStreakLogic(3, 200); // Miss 3 days, meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 3 Days + Meet XP (should reset to 1)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#1e90ff', padding: 10, margin: 5, borderRadius: 5 }}
              onPress={() => {
                console.log("DailyChallenges: Test button pressed: Miss 3 days + Low XP.");
                testStreakLogic(3, 50); // Miss 3 days, don't meet XP
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                Test: Miss 3 Days + Low XP (should reset to 0)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Videos Tab Content */}
        {activeTab === "videos" && (
          <View style={styles.section}>
            <Text style={styles.videoInfoTitle}>{i18n.t('daily_challenge.video_section_title')}</Text>
            <Text style={styles.videoInfoText}>
              {i18n.t('daily_challenge.video_section_description')}
            </Text>
            {!videosLoaded ? (
              <Text style={styles.loadingText}>{i18n.t('daily_challenge.loading')}</Text>
            ) : videos.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('daily_challenge.no_new_videos')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    watchedVideoIds={watchedVideoIds}
                    onPress={openVideoModal}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Community Tab Content */}
        {activeTab === "community" && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>{i18n.t('daily_challenge.how_to_earn_rewards_title')}</Text>
            <View style={styles.rewardList}>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_meaningful_post')} 
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.meaningfulPostXP ?? 30} XP</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_get_likes')} 
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.likesCoins ?? 50} Coins</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_reply_users')} 
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.repliesXP ?? 20} XP</Text>
              </Text>
              <Text style={styles.rewardLine}>
                {i18n.t('daily_challenge.community_receive_comment')} 
                <Text style={styles.rewardAmount}>+{rewardRules?.community?.commentsCoins ?? 15} Coins</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Bonus Chest Section */}
        <BonusChestSection
          dailyXP={dailyXP}
          bonusClaimed={bonusClaimed}
          rewardRules={rewardRules}
          handleClaimBonus={handleClaimBonus}
          chestAnimation={chestAnimation}
          sparkleAnim={sparkleAnim}
        />

        {/* Progress Bars */}
        <ProgressBars
          dailyXP={dailyXP}
          targetXP={targetXP}
          dailyCoins={dailyCoins}
          targetCoins={targetCoins}
        />
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        onClose={() => {
          console.log("DailyChallenges: Video modal closed.");
          setVideoModalVisible(false);
        }}
        currentVideo={currentVideo}
        playerRef={playerRef}
        playing={playing}
        onReady={onReady}
        onStateChange={onStateChange}
        videoDuration={videoDuration}
        videoProgress={videoProgress}
        handleVideoCompletion={handleVideoCompletion}
      />

      {/* XP/Reward Animation Overlay */}
      {(showXPAnimation || rewardPopupVisible) && (
        <View style={styles.animationAnchor}>
          {showXPAnimation && <XPAnimation amount={earnedPollXP} />}
          {rewardPopupVisible && <RewardPopup amount={earnedPollCoins} type="coins" />}
        </View>
      )}
    </ImageBackground>
  );
};

// STYLES
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    minHeight: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1720',
  },
  loadingText: {
    color: '#00FF9D',
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  pollCompletionCard: {
    backgroundColor: "#122433",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#00FF9D",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    marginHorizontal: 8,
  },
  pollCompleteTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00FF9D",
    marginBottom: 8,
  },
  pollCompleteMessage: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },
  videoInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  videoInfoText: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 20,
  },
  rewardCard: {
    backgroundColor: "rgba(0, 20, 30, 0.7)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#00FF9D33",
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  rewardList: {
    gap: 10,
  },
  rewardLine: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 20,
  },
  rewardAmount: {
    color: "#00FF9D",
    fontWeight: "600",
  },
  animationAnchor: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 40,
    left: SCREEN_WIDTH / 2 - 60,
    zIndex: 999,
  },
});

export default DailyChallenges;
"""

print(rewritten_code)